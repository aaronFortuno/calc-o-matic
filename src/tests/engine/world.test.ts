import { describe, it, expect } from 'vitest'
import {
  createWorld,
  addEntity,
  removeEntity,
  getEntityAt,
  getEntityById,
  queryEntitiesByType,
  addObjective,
  isLevelComplete,
} from '../../engine/world'
import { EntityType } from '../../engine/entities/types'
import { createExtractor } from '../../engine/entities/extractor'
import { createConveyor }  from '../../engine/entities/conveyor'

describe('World CRUD', () => {
  it('starts empty', () => {
    const world = createWorld()
    expect(Object.keys(world.entities)).toHaveLength(0)
    expect(world.tickCount).toBe(0)
  })

  it('addEntity adds entity and indexes by tile', () => {
    const world = createWorld()
    const entity = createExtractor('e1', { x: 0, y: 0 }, 5, 3)
    const { state, result } = addEntity(world, entity)
    expect(result.valid).toBe(true)
    expect(state.entities['e1']).toBeDefined()
    expect(state.tileIndex['0,0']).toBe('e1')
  })

  it('addEntity rejects duplicate tile (collision)', () => {
    let world = createWorld()
    const e1 = createExtractor('e1', { x: 0, y: 0 }, 5, 3)
    const e2 = createConveyor('c1', { x: 0, y: 0 })
    ;({ state: world } = addEntity(world, e1))
    const { result } = addEntity(world, e2)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe('OCCUPIED')
    }
  })

  it('removeEntity removes entity and frees tile', () => {
    let world = createWorld()
    const e = createExtractor('e1', { x: 3, y: 4 }, 5, 3)
    ;({ state: world } = addEntity(world, e))
    world = removeEntity(world, 'e1')
    expect(getEntityById(world, 'e1')).toBeUndefined()
    expect(getEntityAt(world, { x: 3, y: 4 })).toBeNull()
  })

  it('getEntityAt returns entity or null', () => {
    let world = createWorld()
    expect(getEntityAt(world, { x: 0, y: 0 })).toBeNull()
    const e = createConveyor('c1', { x: 1, y: 2 })
    ;({ state: world } = addEntity(world, e))
    expect(getEntityAt(world, { x: 1, y: 2 })?.id).toBe('c1')
  })

  it('queryEntitiesByType returns only matching entities', () => {
    let world = createWorld()
    const e1 = createExtractor('e1', { x: 0, y: 0 }, 1, 1)
    const c1 = createConveyor('c1', { x: 1, y: 0 })
    const c2 = createConveyor('c2', { x: 2, y: 0 })
    ;({ state: world } = addEntity(world, e1))
    ;({ state: world } = addEntity(world, c1))
    ;({ state: world } = addEntity(world, c2))

    const extractors = queryEntitiesByType(world, EntityType.EXTRACTOR)
    const conveyors  = queryEntitiesByType(world, EntityType.CONVEYOR)
    expect(extractors).toHaveLength(1)
    expect(conveyors).toHaveLength(2)
  })
})

describe('Objectives', () => {
  it('addObjective appends an objective', () => {
    let world = createWorld()
    world = addObjective(world, {
      id: 'obj1', receiverId: 'r1', description: 'test',
      required: 3, completed: false,
    })
    expect(world.objectives).toHaveLength(1)
  })

  it('isLevelComplete returns false when objectives remain', () => {
    let world = createWorld()
    world = addObjective(world, {
      id: 'obj1', receiverId: 'r1', description: 'test',
      required: 3, completed: false,
    })
    expect(isLevelComplete(world)).toBe(false)
  })

  it('isLevelComplete returns true when all completed', () => {
    let world = createWorld()
    world = addObjective(world, {
      id: 'obj1', receiverId: 'r1', description: 'test',
      required: 3, completed: true,
    })
    expect(isLevelComplete(world)).toBe(true)
  })

  it('isLevelComplete returns false when no objectives', () => {
    expect(isLevelComplete(createWorld())).toBe(false)
  })
})
