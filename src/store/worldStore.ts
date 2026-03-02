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
import type { ToolType }    from './uiStore'
import { OperatorType }     from '../engine/entities/types'

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
  generateLevel: (seed: number, difficulty: number) => void
  importLevelJson: (json: string) => { success: true } | { success: false; error: string }
  exportLevelJson: () => string

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
  // Callback invoked by the TickEngine after each tick
  const onTick = (world: WorldState) => {
    set({ world })
  }

  return {
    world:      createWorld(),
    viewport:   createViewport(),
    objectives: [],
    seed:       1,
    difficulty: 0,
    tickRate:   8,
    running:    false,
    adminPass:  getAdminPass(),

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
      const { seed, difficulty } = get()
      const def = generate({ seed, difficulty })
      const { world, objectives } = levelDefToWorld(def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      set({ world, objectives, running: false })
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
      const { world } = get()
      const eid = world.tileIndex[`${tile.x},${tile.y}`]
      if (!eid) return
      const newWorld = engineRemoveEntity(world, eid)
      _engine?.setState(newWorld)
      set({ world: newWorld })
    },

    rotateEntityAt(tile) {
      const { world } = get()
      const eid = world.tileIndex[`${tile.x},${tile.y}`]
      if (!eid) return
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

    generateLevel(seed, difficulty) {
      _engine?.stop()
      const def = generate({ seed, difficulty })
      const { world, objectives } = levelDefToWorld(def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      set({ world, objectives, seed, difficulty, running: false })
    },

    importLevelJson(json) {
      const result = importLevel(json)
      if (!result.success) return result

      _engine?.stop()
      const { world, objectives } = levelDefToWorld(result.def)
      _engine = new TickEngine(world, onTick, get().tickRate)
      set({
        world,
        objectives,
        seed:       result.def.seed,
        difficulty: result.def.difficulty,
        running:    false,
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
