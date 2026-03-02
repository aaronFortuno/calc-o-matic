import { describe, it, expect, beforeEach } from 'vitest'
import {
  exportLevel,
  importLevel,
  levelDefToWorld,
  saveWorldToSlot,
  loadWorldFromSlot,
  clearSaveSlot,
} from '../../engine/procedural/serializer'
import { createWorld, addEntity, addObjective } from '../../engine/world'
import { createExtractor } from '../../engine/entities/extractor'
import { createConveyor }  from '../../engine/entities/conveyor'
import { createReceiver }  from '../../engine/entities/receiver'
import { ConveyorDirection } from '../../engine/entities/types'
import type { Objective } from '../../engine/entities/types'

function buildSampleWorld() {
  let world = createWorld()
  const e = createExtractor('e1', { x: 0, y: 0 }, 5, 3, ConveyorDirection.RIGHT)
  const c = createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT)
  const r = createReceiver('r1', { x: 2, y: 0 }, 5, 3)
  ;({ state: world } = addEntity(world, e))
  ;({ state: world } = addEntity(world, c))
  ;({ state: world } = addEntity(world, r))
  const obj: Objective = {
    id: 'obj1', receiverId: 'r1', description: 'Deliver 3 tokens',
    required: 3, completed: false,
  }
  world = addObjective(world, obj)
  return { world, objectives: [obj] }
}

describe('exportLevel / importLevel', () => {
  it('exportLevel returns valid JSON', () => {
    const { world, objectives } = buildSampleWorld()
    const json = exportLevel(world, objectives, 1, 0)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('round-trips: import(export(world)) produces valid LevelDefinition', () => {
    const { world, objectives } = buildSampleWorld()
    const json   = exportLevel(world, objectives, 1, 0)
    const result = importLevel(json)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.def.entities).toHaveLength(3)
      expect(result.def.objectives).toHaveLength(1)
    }
  })

  it('importLevel rejects malformed JSON', () => {
    const result = importLevel('not json{')
    expect(result.success).toBe(false)
  })

  it('importLevel rejects wrong version', () => {
    const result = importLevel(JSON.stringify({ version: 99, entities: [], objectives: [] }))
    expect(result.success).toBe(false)
  })

  it('importLevel rejects missing entities', () => {
    const result = importLevel(JSON.stringify({ version: 1, objectives: [] }))
    expect(result.success).toBe(false)
  })
})

describe('levelDefToWorld', () => {
  it('creates a fresh world from a level definition', () => {
    const { world, objectives } = buildSampleWorld()
    const json   = exportLevel(world, objectives, 1, 0)
    const result = importLevel(json)
    if (!result.success) throw new Error('import failed')

    const { world: newWorld, objectives: newObj } = levelDefToWorld(result.def)
    expect(Object.keys(newWorld.entities)).toHaveLength(3)
    expect(newObj.every(o => !o.completed)).toBe(true)
    expect(Object.keys(newWorld.tokens)).toHaveLength(0) // fresh, no tokens
  })
})

describe('Save slots', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads a world from a slot', () => {
    const { world, objectives } = buildSampleWorld()
    saveWorldToSlot(0, world, objectives)
    const loaded = loadWorldFromSlot(0)
    expect(loaded).not.toBeNull()
    expect(Object.keys(loaded!.world.entities)).toHaveLength(3)
  })

  it('returns null for empty slot', () => {
    expect(loadWorldFromSlot(0)).toBeNull()
  })

  it('clearSaveSlot removes saved data', () => {
    const { world, objectives } = buildSampleWorld()
    saveWorldToSlot(1, world, objectives)
    clearSaveSlot(1)
    expect(loadWorldFromSlot(1)).toBeNull()
  })
})
