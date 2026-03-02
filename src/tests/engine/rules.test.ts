import { describe, it, expect } from 'vitest'
import {
  validatePlacement,
  getAdjacentEntities,
  isConveyorFeedingTile,
  isExtractorConnected,
  isReceiverConnected,
  checkConnectivity,
} from '../../engine/procedural/rules'
import { createWorld, addEntity } from '../../engine/world'
import { createExtractor } from '../../engine/entities/extractor'
import { createConveyor }  from '../../engine/entities/conveyor'
import { createReceiver }  from '../../engine/entities/receiver'
import { ConveyorDirection } from '../../engine/entities/types'

describe('validatePlacement', () => {
  it('rejects placement on occupied tile', () => {
    let world = createWorld()
    const e1 = createExtractor('e1', { x: 0, y: 0 }, 1, 1)
    ;({ state: world } = addEntity(world, e1))

    const e2 = createConveyor('c1', { x: 0, y: 0 })
    const result = validatePlacement(world, e2)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('OCCUPIED')
  })

  it('allows placement on empty tile', () => {
    const world = createWorld()
    const e = createConveyor('c1', { x: 5, y: 5 })
    expect(validatePlacement(world, e).valid).toBe(true)
  })
})

describe('getAdjacentEntities', () => {
  it('returns entities on adjacent tiles', () => {
    let world = createWorld()
    const c1 = createConveyor('c1', { x: 1, y: 0 })
    const c2 = createConveyor('c2', { x: -1, y: 0 })
    ;({ state: world } = addEntity(world, c1))
    ;({ state: world } = addEntity(world, c2))

    const adj = getAdjacentEntities(world, { x: 0, y: 0 })
    expect(adj).toHaveLength(2)
  })
})

describe('isConveyorFeedingTile', () => {
  it('returns true when conveyor points to target', () => {
    const c = createConveyor('c1', { x: 0, y: 0 }, ConveyorDirection.RIGHT)
    expect(isConveyorFeedingTile(c, { x: 1, y: 0 })).toBe(true)
  })

  it('returns false when conveyor points away', () => {
    const c = createConveyor('c1', { x: 0, y: 0 }, ConveyorDirection.LEFT)
    expect(isConveyorFeedingTile(c, { x: 1, y: 0 })).toBe(false)
  })
})

describe('isExtractorConnected', () => {
  it('returns true when conveyor is on output tile', () => {
    let world = createWorld()
    const e = createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT)
    const c = createConveyor('c1', { x: 1, y: 0 })
    ;({ state: world } = addEntity(world, e))
    ;({ state: world } = addEntity(world, c))
    expect(isExtractorConnected(world, e)).toBe(true)
  })

  it('returns false when no conveyor on output tile', () => {
    let world = createWorld()
    const e = createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT)
    ;({ state: world } = addEntity(world, e))
    expect(isExtractorConnected(world, e)).toBe(false)
  })
})

describe('isReceiverConnected', () => {
  it('returns true when conveyor feeds receiver', () => {
    let world = createWorld()
    const c = createConveyor('c1', { x: 0, y: 0 }, ConveyorDirection.RIGHT)
    const r = createReceiver('r1', { x: 1, y: 0 }, 5, 3)
    ;({ state: world } = addEntity(world, c))
    ;({ state: world } = addEntity(world, r))
    expect(isReceiverConnected(world, r)).toBe(true)
  })

  it('returns false when no conveyor feeds receiver', () => {
    let world = createWorld()
    const r = createReceiver('r1', { x: 1, y: 0 }, 5, 3)
    ;({ state: world } = addEntity(world, r))
    expect(isReceiverConnected(world, r)).toBe(false)
  })
})

describe('checkConnectivity', () => {
  it('returns connected for unknown entity', () => {
    const world = createWorld()
    expect(checkConnectivity(world, 'nonexistent').connected).toBe(false)
  })

  it('conveyors are always connected', () => {
    let world = createWorld()
    const c = createConveyor('c1', { x: 0, y: 0 })
    ;({ state: world } = addEntity(world, c))
    expect(checkConnectivity(world, 'c1').connected).toBe(true)
  })
})
