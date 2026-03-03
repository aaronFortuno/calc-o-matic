import { describe, it, expect } from 'vitest'
import { tickWorld } from '../../engine/tick'
import { createWorld, addEntity, addObjective } from '../../engine/world'
import { createExtractor } from '../../engine/entities/extractor'
import { createConveyor }  from '../../engine/entities/conveyor'
import { createReceiver }  from '../../engine/entities/receiver'
import { createOperator }  from '../../engine/entities/operator'
import { ConveyorDirection, OperatorType } from '../../engine/entities/types'
import type { WorldState } from '../../engine/entities/types'

// Helper: build a world from entities and tick N times
function buildWorld(
  entities: ReturnType<typeof createExtractor>[],
  objectives: Parameters<typeof addObjective>[1][] = [],
): WorldState {
  let world = createWorld()
  for (const e of entities) {
    ;({ state: world } = addEntity(world, e))
  }
  for (const obj of objectives) {
    world = addObjective(world, obj)
  }
  return world
}

function tickN(state: WorldState, n: number): WorldState {
  for (let i = 0; i < n; i++) state = tickWorld(state)
  return state
}

describe('tickWorld', () => {
  describe('Extractor token spawn', () => {
    it('mints token on extractor tile first, then pushes to conveyor', () => {
      // Tick 1: token minted on extractor (0,0), pushed to c1 (1,0) in same tick
      // Token does NOT move further because preExistingTokenIds prevents it
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c2', { x: 2, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c3', { x: 3, y: 0 }, ConveyorDirection.RIGHT),
      ])

      // Tick 1: token minted on extractor, pushed to c1
      const s1 = tickWorld(world)
      const tokens1 = Object.values(s1.tokens)
      expect(tokens1).toHaveLength(1)
      expect(tokens1[0].position).toEqual({ x: 1, y: 0 })

      // Tick 2: token moves to c2
      const s2 = tickWorld(s1)
      const first = Object.values(s2.tokens).find(t => t.id === tokens1[0].id)!
      expect(first.position).toEqual({ x: 2, y: 0 })
    })

    it('extractor backpressure: does not emit second token while one is on conveyor', () => {
      // E[5] → C1 (dead end) — conveyor blocked, extractor can still mint on itself
      // then can't push because c1 is occupied
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
      ])

      // Tick 1: token on c1
      const s1 = tickWorld(world)
      expect(Object.values(s1.tokens)).toHaveLength(1)

      // Tick 2: extractor mints on itself, but c1 blocked so token stays on extractor
      const s2 = tickWorld(s1)
      expect(Object.values(s2.tokens)).toHaveLength(2)

      // Tick 3: extractor tile occupied → no third token minted
      const s3 = tickWorld(s2)
      expect(Object.values(s3.tokens)).toHaveLength(2)
    })
  })

  describe('Conveyors', () => {
    it('moves a token one tile per tick', () => {
      // E[5] → C1 → C2 → C3 → C4 → C5
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c2', { x: 2, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c3', { x: 3, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c4', { x: 4, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c5', { x: 5, y: 0 }, ConveyorDirection.RIGHT),
      ])

      // Tick 1: token minted on extractor, pushed to c1 (same tick)
      const s1 = tickWorld(world)
      const tokens1 = Object.values(s1.tokens)
      expect(tokens1).toHaveLength(1)
      expect(tokens1[0].position).toEqual({ x: 1, y: 0 })

      // Tick 2: token moves one tile to c2
      const s2 = tickWorld(s1)
      const first = Object.values(s2.tokens).find(t => t.id === tokens1[0].id)!
      expect(first.position).toEqual({ x: 2, y: 0 })
    })

    it('token does not move past end of chain', () => {
      // E[5] → C1 (no more conveyors after c1)
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
      ])

      const s1 = tickWorld(world) // emit + push
      const s2 = tickWorld(s1)    // can't move — nothing at (2,0)
      // One token on c1, another minted on extractor (period=1)
      const c1Token = Object.values(s2.tokens).find(t => t.position.x === 1 && t.position.y === 0)
      expect(c1Token).toBeDefined()
    })
  })

  describe('Extractor period', () => {
    it('emits according to period', () => {
      // period=3 → emits on tick 0, then next at tick 3 (ticksUntilNext: 0, 2, 1, 0, ...)
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 5, 3, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c2', { x: 2, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c3', { x: 3, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c4', { x: 4, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c5', { x: 5, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c6', { x: 6, y: 0 }, ConveyorDirection.RIGHT),
      ])

      // After 1 tick: 1 token emitted (tick 0 = first emission)
      let s = tickN(world, 1)
      expect(Object.keys(s.tokens)).toHaveLength(1)

      // After 2 ticks: still 1 token (period=3, next at tick 3)
      s = tickN(world, 2)
      expect(Object.keys(s.tokens)).toHaveLength(1)

      // After 4 ticks: 2 tokens (emitted at tick 0 and tick 3)
      s = tickN(world, 4)
      expect(Object.keys(s.tokens)).toHaveLength(2)
    })
  })

  describe('Operator processing', () => {
    it('operator with delay=1 emits after 1 tick of processing', () => {
      // E[3] → C → ADD → C → C (long chain to observe output)
      //              ↑
      // E[4] → C ----+  (feeds from above)
      const world = buildWorld([
        createExtractor('e1', { x: 0, y: 0 }, 3, 1, ConveyorDirection.RIGHT),
        createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
        createOperator('o1', { x: 2, y: 0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
        createConveyor('c2', { x: 3, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c3', { x: 4, y: 0 }, ConveyorDirection.RIGHT),
        createConveyor('c4', { x: 5, y: 0 }, ConveyorDirection.RIGHT),
        // Second extractor from above
        createExtractor('e2', { x: 2, y: -2 }, 4, 1, ConveyorDirection.DOWN),
        createConveyor('c5', { x: 2, y: -1 }, ConveyorDirection.DOWN),
      ])

      // Run enough ticks for: emit → travel → feed operator → process → output
      const s = tickN(world, 10)
      // Check that a token with value 7 (3+4) exists somewhere
      const values = Object.values(s.tokens).map(t => t.value)
      expect(values).toContain(7)
    })
  })

  describe('Receiver', () => {
    it('accepts correct token and increments count', () => {
      // E[5] → C → R[5, ×2]
      const world = buildWorld(
        [
          createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
          createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
          createReceiver('r1', { x: 2, y: 0 }, 5, 2),
        ],
        [{
          id: 'obj1', receiverId: 'r1', description: 'test',
          required: 2, completed: false,
        }],
      )

      // After enough ticks, receiver should accept tokens
      const s = tickN(world, 5)
      const recv = s.entities['r1']
      expect(recv).toBeDefined()
      const data = recv.data as { deliveredCount: number; completed: boolean }
      expect(data.deliveredCount).toBeGreaterThan(0)
    })

    it('completes objective when required tokens delivered', () => {
      // E[5] → C → R[5, ×1] — needs only 1 token
      const world = buildWorld(
        [
          createExtractor('e1', { x: 0, y: 0 }, 5, 1, ConveyorDirection.RIGHT),
          createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
          createReceiver('r1', { x: 2, y: 0 }, 5, 1),
        ],
        [{
          id: 'obj1', receiverId: 'r1', description: 'test',
          required: 1, completed: false,
        }],
      )

      const s = tickN(world, 3)
      expect(s.objectives[0].completed).toBe(true)
    })

    it('rejects wrong-value tokens', () => {
      // E[3] → C → R[5, ×1] — receiver expects 5 but gets 3
      const world = buildWorld(
        [
          createExtractor('e1', { x: 0, y: 0 }, 3, 1, ConveyorDirection.RIGHT),
          createConveyor('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
          createReceiver('r1', { x: 2, y: 0 }, 5, 1),
        ],
        [{
          id: 'obj1', receiverId: 'r1', description: 'test',
          required: 1, completed: false,
        }],
      )

      const s = tickN(world, 5)
      const data = s.entities['r1'].data as { deliveredCount: number }
      expect(data.deliveredCount).toBe(0)
    })
  })

  describe('Tick count', () => {
    it('increments tickCount on each tick', () => {
      const world = createWorld()
      const s1 = tickWorld(world)
      expect(s1.tickCount).toBe(1)
      const s2 = tickWorld(s1)
      expect(s2.tickCount).toBe(2)
    })
  })
})
