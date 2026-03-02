// =============================================================================
// generator.ts — Deterministic procedural level generator.
//
// Given a (seed, difficulty) pair, always produces the same LevelDefinition.
// The seed drives a simple LCG RNG; difficulty controls layout complexity.
//
// Difficulty map:
//   0  — single extractor, straight conveyor belt, receiver  (tutorial-like)
//   1  — two extractors, one binary operator (ADD or MUL)
//   2  — three extractors, two chained binary operators
//   3+ — SQUARE + ADD chain (introduces advanced operators)
//
// To add a new difficulty template: add a case in generate() and write a
// dedicated genDN() function following the pattern below.
// =============================================================================

import type { LevelDefinition, Entity, Objective } from '../entities/types'
import { ConveyorDirection, OperatorType } from '../entities/types'
import { createExtractor } from '../entities/extractor'
import { createConveyor }  from '../entities/conveyor'
import { createOperator }  from '../entities/operator'
import { createReceiver }  from '../entities/receiver'

// ---------------------------------------------------------------------------
// Seeded LCG — Numerical Recipes parameters
// ---------------------------------------------------------------------------

class SeededRNG {
  readonly initialSeed: number
  private state:        number

  constructor(seed: number) {
    this.initialSeed = seed >>> 0          // clamp to uint32
    this.state       = this.initialSeed
  }

  /** Returns a float in [0, 1). */
  next(): number {
    // Equivalent to: state = (1664525 * state + 1013904223) mod 2^32
    this.state = (Math.imul(1664525, this.state) + 1013904223) | 0
    return (this.state >>> 0) / 0x100000000
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Returns a random element from a readonly array. */
  nextItem<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorParams {
  seed:       number
  difficulty: number   // 0–4; values above 4 are treated as 4
}

/**
 * Generate a solvable LevelDefinition for the given seed and difficulty.
 * The result is fully deterministic: same inputs always give the same output.
 */
export function generate(params: GeneratorParams): LevelDefinition {
  const rng        = new SeededRNG(params.seed)
  const difficulty = Math.max(0, Math.min(4, params.difficulty))

  switch (difficulty) {
    case 0:  return genD0(rng)
    case 1:  return genD1(rng)
    case 2:  return genD2(rng)
    default: return genD3(rng, difficulty)
  }
}

// ---------------------------------------------------------------------------
// Difficulty 0 — single extractor → conveyor belt → receiver
//
//  E[v] → C → C → C → R[v, ×3]
//  (0,0)  (1,0)(2,0)(3,0)(4,0)
// ---------------------------------------------------------------------------

function genD0(rng: SeededRNG): LevelDefinition {
  const value = rng.nextInt(2, 9)

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y: 0 }, value, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y: 0 }, ConveyorDirection.RIGHT),
    createConveyor ('c2', { x: 2, y: 0 }, ConveyorDirection.RIGHT),
    createConveyor ('c3', { x: 3, y: 0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 4, y: 0 }, value, 3),
  ]

  const objectives: Objective[] = [{
    id:          'obj1',
    receiverId:  'r1',
    description: `Deliver 3 tokens of value ${value}`,
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 0, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 1 — two extractors + one binary operator (ADD or MUL)
//
//            E[b]           ← (2, -2) DOWN
//             |
//             C             ← (2, -1) DOWN
//             |
//  E[a] → C → O[op] → C → C → R[a op b, ×3]
//  (0,0) (1,0)(2,0)  (3,0)(4,0)(5,0)
// ---------------------------------------------------------------------------

function genD1(rng: SeededRNG): LevelDefinition {
  const useAdd = rng.next() > 0.5
  const opType = useAdd ? OperatorType.ADD : OperatorType.MUL
  const a      = useAdd ? rng.nextInt(2, 15) : rng.nextInt(2, 6)
  const b      = useAdd ? rng.nextInt(2, 15) : rng.nextInt(2, 6)
  const result = useAdd ? a + b : a * b

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, opType, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createConveyor ('c3', { x: 4, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 5, y:  0 }, result, 3),
    // Second extractor feeds from above via a vertical conveyor
    createExtractor('e2', { x: 2, y: -2 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const sym = useAdd ? '+' : '×'
  const objectives: Objective[] = [{
    id:          'obj1',
    receiverId:  'r1',
    description: `Deliver 3 tokens of value ${a} ${sym} ${b} = ${result}`,
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 2 — three extractors + two chained operators
//
//            E[b]         E[c]         ← (2,-2) and (4,-2)
//             |            |
//             C            C           ← (2,-1) and (4,-1)
//             |            |
//  E[a] → C → O1[op1] → C → O2[op2] → C → R[result, ×3]
//  (0,0) (1,0)(2,0)   (3,0)(4,0)    (5,0) (6,0)
// ---------------------------------------------------------------------------

const BINARY_OPS = [OperatorType.ADD, OperatorType.MUL, OperatorType.SUB] as const

function genD2(rng: SeededRNG): LevelDefinition {
  const op1 = rng.nextItem(BINARY_OPS)
  const op2 = rng.nextItem(BINARY_OPS)
  const a   = rng.nextInt(2, 8)
  const b   = rng.nextInt(2, 8)
  const c   = rng.nextInt(2, 8)

  const mid    = applyBinaryOp(a, b, op1)
  const result = applyBinaryOp(mid, c, op2)

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, op1, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, op2, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    // Vertical feeds
    createExtractor('e2', { x: 2, y: -2 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -2 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'obj1',
    receiverId:  'r1',
    description: `Deliver 3 tokens of value ${result}`,
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 2, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 3+ — introduces SQUARE; layout: E[a] → SQUARE → ADD → R[a²+b]
//
//                           E[b]   ← (4,-2)
//                            |
//                            C     ← (4,-1)
//                            |
//  E[a] → C → O1[SQ] → C → O2[ADD] → C → R[a²+b, ×3]
//  (0,0) (1,0)(2,0)  (3,0)(4,0)    (5,0) (6,0)
// ---------------------------------------------------------------------------

function genD3(rng: SeededRNG, _difficulty: number): LevelDefinition {
  const a      = rng.nextInt(2, 7)
  const b      = rng.nextInt(1, 9)
  const result = a * a + b

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SQUARE, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 4, y: -2 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id:          'obj1',
    receiverId:  'r1',
    description: `Deliver 3 tokens of value ${a}² + ${b} = ${result}`,
    required:    3,
    completed:   false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: _difficulty, entities, objectives }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyBinaryOp(
  a:  number,
  b:  number,
  op: typeof BINARY_OPS[number],
): number {
  if (op === OperatorType.MUL) return a * b
  if (op === OperatorType.SUB) return a - b
  return a + b   // ADD
}
