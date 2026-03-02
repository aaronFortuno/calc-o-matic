// =============================================================================
// worldStore.ts — Zustand store for world state, viewport, and simulation.
//
// TickEngine is kept as a module-level singleton (not inside Zustand state)
// because class instances are not safely serialisable.  The store exposes
// start / stop / setTickSpeed actions that delegate to the engine.
// =============================================================================

import { create } from 'zustand'
import type { WorldState, Entity, TileCoord, Objective, Viewport } from '../engine/entities/types'
import { EntityType, ConveyorDirection } from '../engine/entities/types'
import { createWorld, addEntity, removeEntity as engineRemoveEntity, updateEntity } from '../engine/world'
import { createViewport, panViewport, zoomViewport } from '../engine/grid'
import { TickEngine } from '../engine/tick'
import { validatePlacement } from '../engine/procedural/rules'
import { generate }         from '../engine/procedural/generator'
import { importLevel, exportLevel, levelDefToWorld, saveWorldToSlot, loadWorldFromSlot, clearSaveSlot } from '../engine/procedural/serializer'
import { createExtractor }  from '../engine/entities/extractor'
import { createConveyor, rotateConveyor } from '../engine/entities/conveyor'
import { createOperator }   from '../engine/entities/operator'
import type { ToolType }    from '../engine/entities/types'
import { OperatorType }     from '../engine/entities/types'
import { getLevelCatalog }  from '../engine/procedural/tutorials'
import type { LevelEntry }  from '../engine/procedural/tutorials'
import { usePlayerStore, XP_PER_OBJECTIVE } from './playerStore'

// ---------------------------------------------------------------------------
// Module-level TickEngine singleton
// ---------------------------------------------------------------------------

let _engine: TickEngine | null = null

function getEngine(onTick: (state: WorldState) => void, tickRate: number): TickEngine {
  if (!_engine) {
    _engine = new TickEngine(createWorld(), onTick, tickRate)
  }
  return _engine
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _nextId = 1000

function nextId(prefix: string): string {
  return `${prefix}_${_nextId++}`
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface WorldStore {
  world:      WorldState
  viewport:   Viewport
  objectives: Objective[]
  seed:       number
  difficulty: number
  tickRate:   number
  running:    boolean
  adminPass:  string    // passphrase for admin panel (read from localStorage on init)

  // Level progression
  currentLevelId:   string | null       // id from LevelEntry or "procedural-{seed}-{difficulty}"
  currentLevelName: string | null       // display name (i18n key)
  levelComplete:    boolean             // true when all objectives completed this run
  levelCatalog:     LevelEntry[]        // tutorial + procedural catalog

  // Puzzle constraints
  lockedEntityIds:  string[]            // entities the player cannot erase/rotate
  allowedTools:     string[] | null     // null = all tools available

  // Simulation controls
  startSim:     () => void
  stopSim:      () => void
  setTickRate:  (rate: number) => void
  resetSim:     () => void

  // Entity placement / removal
  placeEntity:  (tile: TileCoord, tool: ToolType) => string | null  // returns entity id or null on failure
  removeEntityAt: (tile: TileCoord) => void
  rotateEntityAt: (tile: TileCoord) => void

  // Viewport
  panViewport:  (dx: number, dy: number) => void
  zoomViewport: (delta: number, focalX: number, focalY: number) => void

  // Level management
  loadCatalogLevel: (levelId: string) => void
  nextLevel:        () => void
  generateLevel:    (seed: number, difficulty: number) => void
  importLevelJson:  (json: string) => { success: true } | { success: false; error: string }
  exportLevelJson:  () => string
  dismissLevelComplete: () => void

  // Save slots
  saveToSlot:   (index: number) => void
  loadFromSlot: (index: number) => boolean
  clearSlot:    (index: number) => void

  // Internal — called by TickEngine on every tick
  _onTick: (state: WorldState) => void
}

// ---------------------------------------------------------------------------
// Default admin passphrase
// ---------------------------------------------------------------------------

const ADMIN_PASS_KEY = 'calc-o-matic:adminPass'

function getAdminPass(): string {
  return localStorage.getItem(ADMIN_PASS_KEY) ?? 'admin'
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorldStore = create<WorldStore>()((set, get) => {
  // Track which objectives were already completed (to avoid double-awarding XP)
  let _completedObjectiveIds = new Set<string>()

  // Callback invoked by the TickEngine after each tick
  const onTick = (world: WorldState) => {
    // Detect newly completed objectives by comparing with our tracked set
    const newlyCompleted = world.objectives.filter(
      obj => obj.completed && !_completedObjectiveIds.has(obj.id),
    )

    // Award XP for each newly completed objective
    if (newlyCompleted.length > 0) {
      const playerStore = usePlayerStore.getState()
      for (const obj of newlyCompleted) {
        _completedObjectiveIds.add(obj.id)
        playerStore.awardXP(XP_PER_OBJECTIVE)
      }
    }

    // Check if all objectives are now complete
    const allDone = world.objectives.length > 0 && world.objectives.every(o => o.completed)

    set({ world, objectives: world.objectives })

    if (allDone && !get().levelComplete) {
      // Mark level complete, stop simulation, record in player profile
      _engine?.stop()
      const { currentLevelId } = get()
      if (currentLevelId) {
        usePlayerStore.getState().completeLevel(currentLevelId)
      }
      set({ running: false, levelComplete: true })
    }
  }

  // Load the initial level catalog
  const catalog = getLevelCatalog()

  return {
    world:      createWorld(),
    viewport:   createViewport(),
    objectives: [],
    seed:       1,
    difficulty: 0,
    tickRate:   8,
    running:    false,
    adminPass:  getAdminPass(),
    currentLevelId:   null,
    currentLevelName: null,
    levelComplete:    false,
    levelCatalog:     catalog,
    lockedEntityIds:  [],
    allowedTools:     null,

    // -----------------------------------------------------------------------
    // Simulation
    // -----------------------------------------------------------------------

    startSim() {
      const { world, objectives, tickRate } = get()
      // Check if all objectives are already complete
      if (objectives.length > 0 && objectives.every(o => o.completed)) return

      const engine = getEngine(onTick, tickRate)
      engine.setState(world)
      engine.setTickRate(tickRate)
      engine.start()
      set({ running: true })
    },

    stopSim() {
      _engine?.stop()
      set({ running: false })
    },

    setTickRate(rate) {
      const clamped = Math.max(1, Math.min(20, rate))
      _engine?.setTickRate(clamped)
      set({ tickRate: clamped })
    },

    resetSim() {
      _engine?.stop()
      _completedObjectiveIds = new Set()
      const { currentLevelId, levelCatalog, seed, difficulty } = get()

      // If we're on a catalog level, regenerate from its definition
      const catalogEntry = levelCatalog.find(l => l.id === currentLevelId)
      const def = catalogEntry ? catalogEntry.generate() : generate({ seed, difficulty })
      const { world, objectives, lockedEntityIds, allowedTools } = levelDefToWorld(def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      set({ world, objectives, running: false, levelComplete: false, lockedEntityIds, allowedTools })
    },

    // -----------------------------------------------------------------------
    // Entity placement
    // -----------------------------------------------------------------------

    placeEntity(tile, tool) {
      const { world } = get()

      let entity: Entity

      if (tool === 'eraser') {
        get().removeEntityAt(tile)
        return null
      }

      if (tool === 'extractor') {
        entity = createExtractor(nextId('e'), tile, 1, 3, ConveyorDirection.RIGHT)
      } else if (tool === 'conveyor') {
        entity = createConveyor(nextId('c'), tile, ConveyorDirection.RIGHT)
      } else {
        // Operator
        entity = createOperator(nextId('o'), tile, tool as OperatorType, ConveyorDirection.RIGHT, 1)
      }

      const result = validatePlacement(world, entity)
      if (!result.valid) return null

      const { state: newWorld, result: addResult } = addEntity(world, entity)
      if (!addResult.valid) return null

      // Sync engine if running
      _engine?.setState(newWorld)
      set({ world: newWorld })
      return entity.id
    },

    removeEntityAt(tile) {
      const { world, lockedEntityIds } = get()
      const eid = world.tileIndex[`${tile.x},${tile.y}`]
      if (!eid) return
      if (lockedEntityIds.includes(eid)) return  // locked — cannot remove
      const newWorld = engineRemoveEntity(world, eid)
      _engine?.setState(newWorld)
      set({ world: newWorld })
    },

    rotateEntityAt(tile) {
      const { world, lockedEntityIds } = get()
      const eid = world.tileIndex[`${tile.x},${tile.y}`]
      if (!eid) return
      if (lockedEntityIds.includes(eid)) return  // locked — cannot rotate
      const entity = world.entities[eid]
      if (!entity || entity.type !== EntityType.CONVEYOR) return
      const newWorld = updateEntity(world, eid, () => rotateConveyor(entity))
      _engine?.setState(newWorld)
      set({ world: newWorld })
    },

    // -----------------------------------------------------------------------
    // Viewport
    // -----------------------------------------------------------------------

    panViewport(dx, dy) {
      set((s) => ({ viewport: panViewport(s.viewport, dx, dy) }))
    },

    zoomViewport(delta, focalX, focalY) {
      set((s) => ({ viewport: zoomViewport(s.viewport, delta, focalX, focalY) }))
    },

    // -----------------------------------------------------------------------
    // Level management
    // -----------------------------------------------------------------------

    loadCatalogLevel(levelId) {
      _engine?.stop()
      _completedObjectiveIds = new Set()
      const { levelCatalog } = get()
      const entry = levelCatalog.find(l => l.id === levelId)
      if (!entry) return

      const def = entry.generate()
      const { world, objectives, lockedEntityIds, allowedTools } = levelDefToWorld(def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      set({
        world,
        objectives,
        seed:             def.seed,
        difficulty:       def.difficulty,
        running:          false,
        levelComplete:    false,
        currentLevelId:   entry.id,
        currentLevelName: entry.name,
        lockedEntityIds,
        allowedTools,
      })
    },

    nextLevel() {
      const { currentLevelId, levelCatalog } = get()
      const currentIndex = levelCatalog.findIndex(l => l.id === currentLevelId)

      if (currentIndex >= 0 && currentIndex < levelCatalog.length - 1) {
        // Load next catalog level
        get().loadCatalogLevel(levelCatalog[currentIndex + 1].id)
      } else {
        // Past catalog levels — generate a procedural level
        const nextSeed = get().seed + 1
        const diff = Math.min(4, Math.max(1, get().difficulty + 1))
        get().generateLevel(nextSeed, diff)
      }
    },

    dismissLevelComplete() {
      set({ levelComplete: false })
    },

    generateLevel(seed, difficulty) {
      _engine?.stop()
      _completedObjectiveIds = new Set()
      const def = generate({ seed, difficulty })
      const { world, objectives, lockedEntityIds, allowedTools } = levelDefToWorld(def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      const levelId = `procedural-${seed}-${difficulty}`
      set({
        world,
        objectives,
        seed,
        difficulty,
        running:          false,
        levelComplete:    false,
        currentLevelId:   levelId,
        currentLevelName: `levels.procedural`,
        lockedEntityIds,
        allowedTools,
      })
    },

    importLevelJson(json) {
      const result = importLevel(json)
      if (!result.success) return result

      _engine?.stop()
      _completedObjectiveIds = new Set()
      const { world, objectives, lockedEntityIds, allowedTools } = levelDefToWorld(result.def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      const levelId = `imported-${result.def.seed}-${result.def.difficulty}`
      set({
        world,
        objectives,
        seed:             result.def.seed,
        difficulty:       result.def.difficulty,
        running:          false,
        levelComplete:    false,
        currentLevelId:   levelId,
        currentLevelName: null,
        lockedEntityIds,
        allowedTools,
      })
      return { success: true }
    },

    exportLevelJson() {
      const { world, objectives, seed, difficulty } = get()
      return exportLevel(world, objectives, seed, difficulty)
    },

    // -----------------------------------------------------------------------
    // Save slots
    // -----------------------------------------------------------------------

    saveToSlot(index) {
      const { world, objectives } = get()
      saveWorldToSlot(index, world, objectives)
    },

    loadFromSlot(index) {
      const data = loadWorldFromSlot(index)
      if (!data) return false
      _engine?.stop()
      _engine = new TickEngine(data.world, onTick, get().tickRate)
      set({ world: data.world, objectives: data.objectives, running: false })
      return true
    },

    clearSlot(index) {
      clearSaveSlot(index)
    },

    // -----------------------------------------------------------------------
    // Internal tick callback (exposed for testing)
    // -----------------------------------------------------------------------

    _onTick: onTick,
  }
})
