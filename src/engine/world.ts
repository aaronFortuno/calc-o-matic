// =============================================================================
// world.ts — Immutable world-state helpers: entity & objective CRUD.
// No React, no side-effects. All functions return a new WorldState.
// =============================================================================

import type {
  WorldState,
  Entity,
  EntityType,
  TileCoord,
  Objective,
  PlacementResult,
} from './entities/types'
import { tileKey } from './grid'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorld(): WorldState {
  return {
    entities:       {},
    tileIndex:      {},
    tokens:         {},
    tokenTileIndex: {},
    objectives:     [],
    tickCount:      0,
    nextTokenId:    0,
  }
}

// ---------------------------------------------------------------------------
// Entity CRUD
// ---------------------------------------------------------------------------

/**
 * Place an entity on the grid.
 * Returns the updated state + a placement result (valid/invalid with reason).
 */
export function addEntity(
  state:  WorldState,
  entity: Entity,
): { state: WorldState; result: PlacementResult } {
  const key = tileKey(entity.position)

  if (state.tileIndex[key]) {
    return { state, result: { valid: false, reason: 'OCCUPIED' } }
  }

  return {
    state: {
      ...state,
      entities:  { ...state.entities,  [entity.id]: entity },
      tileIndex: { ...state.tileIndex, [key]: entity.id },
    },
    result: { valid: true },
  }
}

/** Remove an entity and free its tile. No-op if id is unknown. */
export function removeEntity(state: WorldState, id: string): WorldState {
  const entity = state.entities[id]
  if (!entity) return state

  const entities  = { ...state.entities }
  const tileIndex = { ...state.tileIndex }
  delete entities[id]
  delete tileIndex[tileKey(entity.position)]

  return { ...state, entities, tileIndex }
}

/** Returns the entity occupying a tile, or null. */
export function getEntityAt(state: WorldState, tile: TileCoord): Entity | null {
  const id = state.tileIndex[tileKey(tile)]
  return id ? (state.entities[id] ?? null) : null
}

export function getEntityById(state: WorldState, id: string): Entity | undefined {
  return state.entities[id]
}

/** Return all entities of a given type. */
export function queryEntitiesByType(
  state: WorldState,
  type:  EntityType,
): Entity[] {
  return Object.values(state.entities).filter(e => e.type === type)
}

/**
 * Apply an updater function to a single entity (immutable).
 * Use this for small property changes without rewriting the whole state.
 */
export function updateEntity(
  state:   WorldState,
  id:      string,
  updater: (e: Entity) => Entity,
): WorldState {
  const entity = state.entities[id]
  if (!entity) return state
  return {
    ...state,
    entities: { ...state.entities, [id]: updater(entity) },
  }
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export function addObjective(state: WorldState, objective: Objective): WorldState {
  return { ...state, objectives: [...state.objectives, objective] }
}

export function isLevelComplete(state: WorldState): boolean {
  return (
    state.objectives.length > 0 &&
    state.objectives.every(o => o.completed)
  )
}
