// =============================================================================
// extractor.ts — Factory for Extractor entities.
//
// An Extractor produces one numeric token every `period` ticks and places it
// on the adjacent tile in `outputDirection`.  It emits immediately on the
// first tick (ticksUntilNext starts at 0).
// =============================================================================

import { EntityType, ConveyorDirection } from './types'
import type { Entity, ExtractorData, TileCoord } from './types'

/**
 * Create an Extractor entity.
 *
 * @param value            The numeric value of each emitted token.
 * @param period           Ticks between emissions (minimum 1).
 * @param outputDirection  Which adjacent tile receives the token. Default RIGHT.
 */
export function createExtractor(
  id:              string,
  position:        TileCoord,
  value:           number,
  period:          number,
  outputDirection: ConveyorDirection = ConveyorDirection.RIGHT,
): Entity {
  const data: ExtractorData = {
    value,
    period:         Math.max(1, period),
    ticksUntilNext: 0,   // emit on the very first tick
    outputDirection,
  }
  return { id, type: EntityType.EXTRACTOR, position, data }
}
