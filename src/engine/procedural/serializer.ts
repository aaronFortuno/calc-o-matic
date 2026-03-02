// =============================================================================
// serializer.ts — Level export/import and localStorage save slots.
//
// Two distinct persistence layers:
//   1. Level definitions (LevelDefinition JSON) — used by the admin panel for
//      sharing / importing puzzle layouts.  Always starts fresh on load.
//   2. Save slots — full WorldState snapshots that preserve in-progress tokens,
//      operator counters, and objective progress.
// =============================================================================

import type {
  WorldState,
  LevelDefinition,
  Entity,
  Objective,
} from '../entities/types'
import {
  EntityType,
  OPERATOR_ARITY,
} from '../entities/types'
import type { ExtractorData, OperatorData, ReceiverData } from '../entities/types'
import { createWorld, addEntity, addObjective } from '../world'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFIX         = 'calc-o-matic'
export const SAVE_SLOT_COUNT = 3

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface SaveSlotRecord {
  world:      WorldState
  objectives: Objective[]
  savedAt:    number   // Date.now()
}

export interface SaveSlotMeta {
  index:     number
  tickCount: number
  savedAt:   number   // Unix ms timestamp
  completed: number   // objectives completed
  total:     number   // total objectives
}

// ---------------------------------------------------------------------------
// Level export / import
// ---------------------------------------------------------------------------

/**
 * Serialise the current world layout to a shareable LevelDefinition JSON string.
 * Entity live-state (partial inputs, in-flight tokens) is NOT included —
 * the exported level always starts fresh when imported.
 */
export function exportLevel(
  world:      WorldState,
  objectives: Objective[],
  seed:       number,
  difficulty: number,
): string {
  const def: LevelDefinition = {
    version:    1,
    seed,
    difficulty,
    entities:   Object.values(world.entities),
    // Export objectives with completion reset so import always starts fresh
    objectives: objectives.map(o => ({ ...o, completed: false })),
  }
  return JSON.stringify(def, null, 2)
}

export type ImportResult =
  | { success: true;  def: LevelDefinition }
  | { success: false; error: string }

/**
 * Parse a LevelDefinition JSON string.
 * Returns a typed result — never throws.
 */
export function importLevel(json: string): ImportResult {
  try {
    const def = JSON.parse(json) as LevelDefinition

    if (typeof def !== 'object' || def === null)
      return { success: false, error: 'Not a valid JSON object' }
    if (def.version !== 1)
      return { success: false, error: `Unsupported version: ${String(def.version)}` }
    if (!Array.isArray(def.entities))
      return { success: false, error: 'Missing "entities" array' }
    if (!Array.isArray(def.objectives))
      return { success: false, error: 'Missing "objectives" array' }

    return { success: true, def }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: `JSON parse error: ${message}` }
  }
}

// ---------------------------------------------------------------------------
// Level → WorldState conversion
// ---------------------------------------------------------------------------

/**
 * Build a fresh WorldState from a LevelDefinition.
 * All entity live-state is reset to initial values:
 *   - Extractors:  ticksUntilNext = 0
 *   - Operators:   inputSlots cleared, ticksRemaining = -1, outputQueue = []
 *   - Receivers:   deliveredCount = 0, completed = false
 *   - Conveyors:   unchanged
 * Tokens are NOT restored (the world starts with an empty token map).
 */
export function levelDefToWorld(
  def: LevelDefinition,
): { world: WorldState; objectives: Objective[] } {
  let world = createWorld()

  for (const raw of def.entities) {
    const entity = resetEntityState(raw)
    const { state, result } = addEntity(world, entity)
    if (!result.valid) {
      console.warn(`[serializer] Skipped entity ${entity.id} at import: ${result.reason}`)
    }
    world = state
  }

  for (const obj of def.objectives) {
    world = addObjective(world, { ...obj, completed: false })
  }

  return { world, objectives: def.objectives.map(o => ({ ...o, completed: false })) }
}

/** Reset an entity's live simulation state, preserving its configuration. */
function resetEntityState(entity: Entity): Entity {
  switch (entity.type) {
    case EntityType.EXTRACTOR: {
      const d = entity.data as ExtractorData
      return { ...entity, data: { ...d, ticksUntilNext: 0 } }
    }
    case EntityType.OPERATOR: {
      const d     = entity.data as OperatorData
      const arity = OPERATOR_ARITY[d.type]
      return {
        ...entity,
        data: {
          ...d,
          inputSlots:     new Array<number | null>(arity).fill(null),
          ticksRemaining: -1,
          outputQueue:    [],
        },
      }
    }
    case EntityType.RECEIVER: {
      const d = entity.data as ReceiverData
      return { ...entity, data: { ...d, deliveredCount: 0, completed: false } }
    }
    default:
      return entity
  }
}

// ---------------------------------------------------------------------------
// Save slots (localStorage)
// ---------------------------------------------------------------------------

function slotKey(index: number): string {
  return `${PREFIX}:save:${index}`
}

/**
 * Persist the full current game state to a save slot.
 * Existing data in that slot is overwritten.
 */
export function saveWorldToSlot(
  slotIndex:  number,
  world:      WorldState,
  objectives: Objective[],
): void {
  const record: SaveSlotRecord = { world, objectives, savedAt: Date.now() }
  localStorage.setItem(slotKey(slotIndex), JSON.stringify(record))
}

/**
 * Load a previously saved game state from a slot.
 * Returns null if the slot is empty or the data is corrupt.
 */
export function loadWorldFromSlot(
  slotIndex: number,
): { world: WorldState; objectives: Objective[] } | null {
  try {
    const raw = localStorage.getItem(slotKey(slotIndex))
    if (!raw) return null
    const record = JSON.parse(raw) as SaveSlotRecord
    return { world: record.world, objectives: record.objectives }
  } catch {
    return null
  }
}

/** Delete a save slot. */
export function clearSaveSlot(slotIndex: number): void {
  localStorage.removeItem(slotKey(slotIndex))
}

/**
 * Return metadata for all save slots (null = empty slot).
 * Cheap: reads localStorage but does not fully parse the world state.
 */
export function listSaveSlots(): Array<SaveSlotMeta | null> {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    try {
      const raw = localStorage.getItem(slotKey(i))
      if (!raw) return null
      const record = JSON.parse(raw) as SaveSlotRecord
      return {
        index:     i,
        tickCount: record.world.tickCount,
        savedAt:   record.savedAt,
        completed: record.objectives.filter(o => o.completed).length,
        total:     record.objectives.length,
      }
    } catch {
      return null
    }
  })
}
