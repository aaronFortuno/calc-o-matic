// =============================================================================
// receiver.ts — Factory for Receiver entities.
//
// A Receiver validates arriving tokens against an expected value.
// Each matching token increments deliveredCount; when it equals `required`
// the receiver marks itself completed and its Objective is resolved.
// =============================================================================

import { EntityType } from './types'
import type { Entity, ReceiverData, TileCoord } from './types'

/**
 * Create a Receiver entity.
 *
 * @param expected  The numeric value each arriving token must match.
 * @param required  Number of correct tokens needed to complete the objective.
 */
export function createReceiver(
  id:       string,
  position: TileCoord,
  expected: number,
  required: number,
): Entity {
  const data: ReceiverData = {
    expected,
    required: Math.max(1, required),
    deliveredCount: 0,
    completed: false,
  }
  return { id, type: EntityType.RECEIVER, position, data }
}
