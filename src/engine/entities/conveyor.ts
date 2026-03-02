// =============================================================================
// conveyor.ts — Factory and helpers for Conveyor entities.
//
// A Conveyor occupies one tile and moves tokens one tile per tick in its
// `direction`.  Right-clicking in the UI calls rotateConveyor() to cycle
// through the four cardinal directions clockwise.
// =============================================================================

import { EntityType, ConveyorDirection } from './types'
import type { Entity, ConveyorData, TileCoord } from './types'

/** Clockwise rotation sequence. */
const ROTATE_CW: Record<ConveyorDirection, ConveyorDirection> = {
  [ConveyorDirection.UP]:    ConveyorDirection.RIGHT,
  [ConveyorDirection.RIGHT]: ConveyorDirection.DOWN,
  [ConveyorDirection.DOWN]:  ConveyorDirection.LEFT,
  [ConveyorDirection.LEFT]:  ConveyorDirection.UP,
}

/** Counter-clockwise rotation sequence. */
const ROTATE_CCW: Record<ConveyorDirection, ConveyorDirection> = {
  [ConveyorDirection.UP]:    ConveyorDirection.LEFT,
  [ConveyorDirection.LEFT]:  ConveyorDirection.DOWN,
  [ConveyorDirection.DOWN]:  ConveyorDirection.RIGHT,
  [ConveyorDirection.RIGHT]: ConveyorDirection.UP,
}

/**
 * Create a Conveyor entity.
 *
 * @param direction  Direction tokens travel.  Default RIGHT.
 */
export function createConveyor(
  id:        string,
  position:  TileCoord,
  direction: ConveyorDirection = ConveyorDirection.RIGHT,
): Entity {
  const data: ConveyorData = { direction }
  return { id, type: EntityType.CONVEYOR, position, data }
}

/** Return a new conveyor entity rotated 90° clockwise (used on right-click). */
export function rotateConveyor(entity: Entity): Entity {
  const data = entity.data as ConveyorData
  return { ...entity, data: { ...data, direction: ROTATE_CW[data.direction] } }
}

/** Return a new conveyor entity rotated 90° counter-clockwise. */
export function rotateConveyorCCW(entity: Entity): Entity {
  const data = entity.data as ConveyorData
  return { ...entity, data: { ...data, direction: ROTATE_CCW[data.direction] } }
}
