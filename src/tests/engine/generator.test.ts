import { describe, it, expect } from 'vitest'
import { generate } from '../../engine/procedural/generator'
import { EntityType } from '../../engine/entities/types'
import { tickWorld } from '../../engine/tick'
import { levelDefToWorld } from '../../engine/procedural/serializer'

describe('generate', () => {
  it('same seed + difficulty always produces identical output (determinism)', () => {
    const a = generate({ seed: 42, difficulty: 1 })
    const b = generate({ seed: 42, difficulty: 1 })
    expect(a).toEqual(b)
  })

  it('different seeds produce different layouts', () => {
    const a = generate({ seed: 1, difficulty: 1 })
    const b = generate({ seed: 2, difficulty: 1 })
    // Entity positions or values should differ
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('generated level contains at least one extractor, conveyor, and receiver', () => {
    for (let d = 0; d <= 3; d++) {
      const def = generate({ seed: 100, difficulty: d })
      const types = def.entities.map(e => e.type)
      expect(types).toContain(EntityType.EXTRACTOR)
      expect(types).toContain(EntityType.CONVEYOR)
      expect(types).toContain(EntityType.RECEIVER)
    }
  })

  it('difficulty=0 produces a short conveyor path', () => {
    const def = generate({ seed: 7, difficulty: 0 })
    // D0 has 5 entities: extractor + 3 conveyors + receiver
    expect(def.entities.length).toBeLessThanOrEqual(6)
  })

  it('higher difficulty produces more entities', () => {
    const d0 = generate({ seed: 7, difficulty: 0 })
    const d2 = generate({ seed: 7, difficulty: 2 })
    expect(d2.entities.length).toBeGreaterThan(d0.entities.length)
  })

  it('generated level has at least one objective', () => {
    const def = generate({ seed: 55, difficulty: 1 })
    expect(def.objectives.length).toBeGreaterThan(0)
  })

  it('generated level is solvable (simulation completes within 200 ticks)', () => {
    const MAX_TICKS = 200
    for (let d = 0; d <= 2; d++) {
      const def = generate({ seed: 42, difficulty: d })
      const { world } = levelDefToWorld(def)
      let state = world
      let solved = false

      for (let t = 0; t < MAX_TICKS; t++) {
        state = tickWorld(state)
        if (state.objectives.every(o => o.completed)) {
          solved = true
          break
        }
      }

      expect(solved).toBe(true)
    }
  })
})
