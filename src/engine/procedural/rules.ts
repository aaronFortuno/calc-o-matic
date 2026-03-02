// =============================================================================
// rules.ts — Placement validation and connectivity checks.
//
// All functions are pure (WorldState in → result out).
// Used by the UI before placing an entity and by the admin panel to highlight
// disconnected components.
// =============================================================================

import type { WorldState, Entity, TileCoord, PlacementResult } from '../entities/types'
import { EntityType, ConveyorDirection, DIRECTION_DELTA } from '../entities/types'
import type { ConveyorData, ExtractorData, OperatorData } from '../entities/types'
import { tileKey } from '../grid'

// ---------------------------------------------------------------------------
// Adjacency helpers
// ---------------------------------------------------------------------------

export interface AdjacentEntity {
  entity:    Entity
  /** Direction FROM the reference tile TO this neighbour. */
  direction: ConveyorDirection
}

/**
 * Return all entities occupying the four tiles adjacent to `tile`.
 * Does not include the entity on `tile` itself.
 */
export function getAdjacentEntities(
  world: WorldState,
  tile:  TileCoord,
): AdjacentEntity[] {
  const results: AdjacentEntity[] = []
  for (const dir of Object.values(ConveyorDirection)) {
    const delta     = DIRECTION_DELTA[dir]
    const neighbour = { x: tile.x + delta.x, y: tile.y + delta.y }
    const eid       = world.tileIndex[tileKey(neighbour)]
    if (eid) {
      results.push({ entity: world.entities[eid], direction: dir })
    }
  }
  return results
}

/**
 * Returns true when a conveyor entity is pointing toward `targetTile`
 * (i.e. its direction delta leads from its position to the target).
 */
export function isConveyorFeedingTile(conveyor: Entity, targetTile: TileCoord): boolean {
  if (conveyor.type !== EntityType.CONVEYOR) return false
  const data  = conveyor.data as ConveyorData
  const delta = DIRECTION_DELTA[data.direction]
  return (
    conveyor.position.x + delta.x === targetTile.x &&
    conveyor.position.y + delta.y === targetTile.y
  )
}

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

/**
 * Check whether `entity` can be legally placed on the grid.
 * Returns { valid: true } or { valid: false, reason }.
 *
 * Current rules (MVP):
 *   - The target tile must be unoccupied.
 *   (World-boundary checks can be added here later.)
 */
export function validatePlacement(
  world:  WorldState,
  entity: Entity,
): PlacementResult {
  const key = tileKey(entity.position)

  if (world.tileIndex[key]) {
    return { valid: false, reason: 'OCCUPIED' }
  }

  return { valid: true }
}

// ---------------------------------------------------------------------------
// Connectivity checks
// ---------------------------------------------------------------------------

/**
 * Returns true when an Extractor has at least one conveyor on its output tile.
 */
export function isExtractorConnected(world: WorldState, extractor: Entity): boolean {
  if (extractor.type !== EntityType.EXTRACTOR) return false
  const data      = extractor.data as ExtractorData
  const delta     = DIRECTION_DELTA[data.outputDirection]
  const outputKey = tileKey({
    x: extractor.position.x + delta.x,
    y: extractor.position.y + delta.y,
  })
  const eid = world.tileIndex[outputKey]
  return !!eid && world.entities[eid]?.type === EntityType.CONVEYOR
}

/**
 * Returns true when at least one conveyor is pointing toward the Receiver's tile.
 */
export function isReceiverConnected(world: WorldState, receiver: Entity): boolean {
  if (receiver.type !== EntityType.RECEIVER) return false
  return getAdjacentEntities(world, receiver.position).some(({ entity }) =>
    isConveyorFeedingTile(entity, receiver.position),
  )
}

/**
 * Returns true when an Operator has a conveyor on its output tile AND at least
 * one conveyor feeding each input slot.
 * For MVP we count any incoming conveyor as filling an input slot regardless
 * of which physical side it approaches from.
 */
export function isOperatorConnected(world: WorldState, operator: Entity): boolean {
  if (operator.type !== EntityType.OPERATOR) return false
  const data = operator.data as OperatorData

  // Output side: must have a conveyor
  const outDelta  = DIRECTION_DELTA[data.outputDirection]
  const outKey    = tileKey({
    x: operator.position.x + outDelta.x,
    y: operator.position.y + outDelta.y,
  })
  const outEid = world.tileIndex[outKey]
  if (!outEid || world.entities[outEid]?.type !== EntityType.CONVEYOR) return false

  // Input sides: count conveyors pointing toward this tile
  const inboundCount = getAdjacentEntities(world, operator.position).filter(({ entity }) =>
    isConveyorFeedingTile(entity, operator.position),
  ).length

  return inboundCount >= data.inputSlots.length
}

/**
 * Generic connectivity check — dispatches to the appropriate typed function.
 * Returns { connected, reason } for use in the UI hint system.
 */
export function checkConnectivity(
  world:    WorldState,
  entityId: string,
): { connected: boolean; reason?: string } {
  const entity = world.entities[entityId]
  if (!entity) return { connected: false, reason: 'Entity not found' }

  switch (entity.type) {
    case EntityType.EXTRACTOR:
      return isExtractorConnected(world, entity)
        ? { connected: true }
        : { connected: false, reason: 'No conveyor on output tile' }

    case EntityType.RECEIVER:
      return isReceiverConnected(world, entity)
        ? { connected: true }
        : { connected: false, reason: 'No conveyor feeding receiver' }

    case EntityType.OPERATOR:
      return isOperatorConnected(world, entity)
        ? { connected: true }
        : { connected: false, reason: 'Missing input or output conveyor' }

    case EntityType.CONVEYOR:
      return { connected: true } // conveyors are always considered connected

    default:
      return { connected: false, reason: 'Unknown entity type' }
  }
}
