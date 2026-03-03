// =============================================================================
// generator.ts — Deterministic procedural level generator.
//
// Given a (seed, difficulty) pair, always produces the same LevelDefinition.
// The seed drives a simple LCG RNG; difficulty controls layout complexity.
//
// Difficulty map:
//   0  — single extractor, straight conveyor belt, receiver  (tutorial-like)
//   1  — two extractors, one binary operator (ADD, MUL, SUB, or DIV)
//   2  — three extractors, two chained binary operators
//   3  — advanced: SQUARE, SQRT, or larger numbers with mixed operators
//   4  — expert: constraint-style puzzles, bigger numbers, deeper chains
//
// Variety features:
//   - Picks from ALL unlockable operators, not just ADD/SQUARE
//   - Uses larger and more interesting numbers at higher difficulties
//   - Ensures clean integer results for division chains
//   - Alternates layout patterns to avoid visual repetition
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
    this.initialSeed = seed >>> 0
    this.state       = this.initialSeed
  }

  next(): number {
    this.state = (Math.imul(1664525, this.state) + 1013904223) | 0
    return (this.state >>> 0) / 0x100000000
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

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

export function generate(params: GeneratorParams): LevelDefinition {
  const rng        = new SeededRNG(params.seed)
  const difficulty = Math.max(0, Math.min(4, params.difficulty))

  switch (difficulty) {
    case 0:  return genD0(rng)
    case 1:  return genD1(rng)
    case 2:  return genD2(rng)
    case 3:  return genD3(rng)
    default: return genD4(rng)
  }
}

// ---------------------------------------------------------------------------
// Difficulty 0 — single extractor → conveyor belt → receiver
//
//  E[v] → C → C → C → R[v, ×3]
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
    id: 'obj1', receiverId: 'r1',
    description: `Deliver 3 tokens of value ${value}`,
    required: 3, completed: false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 0, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 1 — two extractors + one binary operator
//
// Randomly picks from: ADD, MUL, SUB, DIV
// Ensures clean integer results for DIV
// ---------------------------------------------------------------------------

const D1_OPS = [OperatorType.ADD, OperatorType.MUL, OperatorType.SUB, OperatorType.DIV] as const

function genD1(rng: SeededRNG): LevelDefinition {
  const opType = rng.nextItem(D1_OPS)
  let a: number, b: number, result: number

  switch (opType) {
    case OperatorType.ADD:
      a = rng.nextInt(2, 20)
      b = rng.nextInt(2, 20)
      result = a + b
      break
    case OperatorType.MUL:
      a = rng.nextInt(2, 9)
      b = rng.nextInt(2, 9)
      result = a * b
      break
    case OperatorType.SUB:
      a = rng.nextInt(8, 30)
      b = rng.nextInt(1, a - 1) // ensure positive result
      result = a - b
      break
    case OperatorType.DIV:
      b = rng.nextInt(2, 8)
      result = rng.nextInt(2, 12)
      a = b * result // ensure clean division
      break
  }

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, opType, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createConveyor ('c3', { x: 4, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 5, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 2, y: -1 }, ConveyorDirection.DOWN),
  ]

  const sym = opSymbol(opType)
  const objectives: Objective[] = [{
    id: 'obj1', receiverId: 'r1',
    description: `Deliver 3 tokens of value ${a} ${sym} ${b} = ${result}`,
    required: 3, completed: false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 1, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 2 — three extractors + two chained operators (diverse combos)
//
// Picks two operators from: ADD, MUL, SUB, DIV
// Ensures valid integer results throughout the chain
// ---------------------------------------------------------------------------

const D2_OPS = [OperatorType.ADD, OperatorType.MUL, OperatorType.SUB, OperatorType.DIV] as const

function genD2(rng: SeededRNG): LevelDefinition {
  const op1 = rng.nextItem(D2_OPS)
  const op2 = rng.nextItem(D2_OPS)

  // Generate values that guarantee valid integer chain
  const { a, b, c, result } = genChainValues(rng, op1, op2)

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, op1, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, op2, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  const objectives: Objective[] = [{
    id: 'obj1', receiverId: 'r1',
    description: `Deliver 3 tokens of value ${result}`,
    required: 3, completed: false,
  }]

  return { version: 1, seed: rng.initialSeed, difficulty: 2, entities, objectives }
}

// ---------------------------------------------------------------------------
// Difficulty 3 — advanced: SQUARE, SQRT, MOD, larger numbers
//
// Picks from several templates:
//   A) a² + b         (SQUARE + ADD)
//   B) √(a) + b       (SQRT + ADD)  — a is a perfect square
//   C) a × b - c      (MUL + SUB)   — larger numbers
//   D) (a + b) mod c   (ADD + MOD)
//   E) a × b ÷ c      (MUL + DIV)   — ensures clean division
// ---------------------------------------------------------------------------

function genD3(rng: SeededRNG): LevelDefinition {
  const template = rng.nextInt(0, 4)

  switch (template) {
    case 0: return genD3_squareAdd(rng)
    case 1: return genD3_sqrtAdd(rng)
    case 2: return genD3_mulSub(rng)
    case 3: return genD3_addMod(rng)
    default: return genD3_mulDiv(rng)
  }
}

// Template A: a² + b
function genD3_squareAdd(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(2, 9)
  const b      = rng.nextInt(1, 20)
  const result = a * a + b

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SQUARE, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 4, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 3, entities, result)
}

// Template B: √a + b  (a is a perfect square)
function genD3_sqrtAdd(rng: SeededRNG): LevelDefinition {
  const sqrtVal = rng.nextInt(2, 10)
  const a       = sqrtVal * sqrtVal
  const b       = rng.nextInt(1, 15)
  const result  = sqrtVal + b

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SQRT, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 4, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 3, entities, result)
}

// Template C: a × b − c  (larger numbers)
function genD3_mulSub(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(3, 12)
  const b      = rng.nextInt(3, 12)
  const c      = rng.nextInt(1, Math.min(a * b - 1, 30))
  const result = a * b - c

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.SUB, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 3, entities, result)
}

// Template D: (a + b) mod c
function genD3_addMod(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(5, 30)
  const b      = rng.nextInt(5, 30)
  const c      = rng.nextInt(3, 12)
  const result = ((a + b) % c + c) % c

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.MOD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 3, entities, result)
}

// Template E: (a × b) ÷ c  — ensures clean division
function genD3_mulDiv(rng: SeededRNG): LevelDefinition {
  const c      = rng.nextInt(2, 8)
  const quotient = rng.nextInt(2, 15)
  const product  = c * quotient
  // Factor product into a × b (both > 1)
  const a = rng.nextInt(2, Math.max(2, Math.floor(Math.sqrt(product))))
  const b = product / a
  // If b isn't integer, fall back
  const bInt = Math.round(b)
  const realProduct = a * bInt
  const result = Math.floor(realProduct / c)

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.DIV, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, bInt, 3, ConveyorDirection.DOWN),
    createConveyor ('c4', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 4, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 3, entities, result)
}

// ---------------------------------------------------------------------------
// Difficulty 4 — expert: 3-operator chains, bigger numbers, deeper math
//
// Picks from several templates:
//   A) a² − b × c          (SQUARE + SUB with MUL feed)
//   B) (a + b) × c − d     (ADD + MUL + SUB, 4 extractors)
//   C) √(a × b) + c        (MUL + SQRT + ADD)
//   D) a^2 ÷ b + c         (SQUARE + DIV + ADD)
// ---------------------------------------------------------------------------

function genD4(rng: SeededRNG): LevelDefinition {
  const template = rng.nextInt(0, 3)

  switch (template) {
    case 0: return genD4_squareMinusProduct(rng)
    case 1: return genD4_sumTimesMinusD(rng)
    case 2: return genD4_sqrtProduct(rng)
    default: return genD4_squareDivAdd(rng)
  }
}

// Template A: a² − (b × c)
function genD4_squareMinusProduct(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(5, 12)
  const b      = rng.nextInt(2, 6)
  const c      = rng.nextInt(2, Math.max(2, Math.floor((a * a - 1) / b)))
  const result = a * a - b * c

  // Layout: E[a] → SQUARE → SUB → R
  //                          ↑
  //           E[b] → MUL ---+
  //                   ↑
  //                  E[c]
  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SQUARE, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.SUB, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 6, y:  0 }, result, 3),
    // MUL feed from below
    createExtractor('e2', { x: 1, y:  3 }, b, 3, ConveyorDirection.RIGHT),
    createConveyor ('c4', { x: 2, y:  3 }, ConveyorDirection.RIGHT),
    createConveyor ('c7', { x: 3, y:  3 }, ConveyorDirection.RIGHT),
    createOperator ('o3', { x: 4, y:  3 }, OperatorType.MUL, ConveyorDirection.UP, 1),
    createConveyor ('c5', { x: 4, y:  2 }, ConveyorDirection.UP),
    createConveyor ('c8', { x: 4, y:  1 }, ConveyorDirection.UP),
    createExtractor('e3', { x: 4, y:  6 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 4, y:  5 }, ConveyorDirection.DOWN),
    createConveyor ('c9', { x: 4, y:  4 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 4, entities, result)
}

// Template B: (a + b) × c − d
function genD4_sumTimesMinusD(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(3, 15)
  const b      = rng.nextInt(3, 15)
  const c      = rng.nextInt(2, 6)
  const d      = rng.nextInt(1, Math.min((a + b) * c - 1, 40))
  const result = (a + b) * c - d

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o3', { x: 6, y:  0 }, OperatorType.SUB, ConveyorDirection.RIGHT, 1),
    createConveyor ('c4', { x: 7, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 8, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c8', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 4, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c9', { x: 4, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e4', { x: 6, y: -3 }, d, 3, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 6, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c10', { x: 6, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 4, entities, result)
}

// Template C: √(a × b) + c  — a × b is a perfect square
function genD4_sqrtProduct(rng: SeededRNG): LevelDefinition {
  const sqrtVal = rng.nextInt(3, 12)
  const product = sqrtVal * sqrtVal
  // Factor into two values
  const a = rng.nextInt(2, Math.max(2, Math.floor(Math.sqrt(product))))
  const b = Math.round(product / a)
  const c = rng.nextInt(1, 20)
  const result = sqrtVal + c

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.MUL, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.SQRT, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o3', { x: 6, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c4', { x: 7, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 8, y:  0 }, result, 3),
    createExtractor('e2', { x: 2, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 2, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 2, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 6, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 6, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c8', { x: 6, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 4, entities, result)
}

// Template D: a² ÷ b + c  — ensures clean division
function genD4_squareDivAdd(rng: SeededRNG): LevelDefinition {
  const a      = rng.nextInt(4, 12)
  const aSq    = a * a
  // Pick b that divides a² cleanly
  const divisors = getDivisors(aSq).filter(d => d > 1 && d < aSq)
  const b      = divisors.length > 0 ? rng.nextItem(divisors) : 2
  const quotient = Math.floor(aSq / b)
  const c      = rng.nextInt(1, 20)
  const result = quotient + c

  const entities: Entity[] = [
    createExtractor('e1', { x: 0, y:  0 }, a, 3, ConveyorDirection.RIGHT),
    createConveyor ('c1', { x: 1, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o1', { x: 2, y:  0 }, OperatorType.SQUARE, ConveyorDirection.RIGHT, 1),
    createConveyor ('c2', { x: 3, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o2', { x: 4, y:  0 }, OperatorType.DIV, ConveyorDirection.RIGHT, 1),
    createConveyor ('c3', { x: 5, y:  0 }, ConveyorDirection.RIGHT),
    createOperator ('o3', { x: 6, y:  0 }, OperatorType.ADD, ConveyorDirection.RIGHT, 1),
    createConveyor ('c4', { x: 7, y:  0 }, ConveyorDirection.RIGHT),
    createReceiver ('r1', { x: 8, y:  0 }, result, 3),
    createExtractor('e2', { x: 4, y: -3 }, b, 3, ConveyorDirection.DOWN),
    createConveyor ('c5', { x: 4, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c7', { x: 4, y: -1 }, ConveyorDirection.DOWN),
    createExtractor('e3', { x: 6, y: -3 }, c, 3, ConveyorDirection.DOWN),
    createConveyor ('c6', { x: 6, y: -2 }, ConveyorDirection.DOWN),
    createConveyor ('c8', { x: 6, y: -1 }, ConveyorDirection.DOWN),
  ]

  return makeLevel(rng, 4, entities, result)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function opSymbol(op: OperatorType): string {
  switch (op) {
    case OperatorType.ADD:  return '+'
    case OperatorType.SUB:  return '−'
    case OperatorType.MUL:  return '×'
    case OperatorType.DIV:  return '÷'
    default:                return '?'
  }
}

function applyOp(a: number, b: number, op: OperatorType): number {
  switch (op) {
    case OperatorType.ADD:  return a + b
    case OperatorType.SUB:  return a - b
    case OperatorType.MUL:  return a * b
    case OperatorType.DIV:  return b !== 0 ? a / b : 0
    default:                return a + b
  }
}

/** Generate chain values a op1 b op2 c, ensuring integer results. */
function genChainValues(
  rng: SeededRNG,
  op1: OperatorType,
  op2: OperatorType,
): { a: number; b: number; c: number; mid: number; result: number } {
  // Attempt up to 20 times to find a valid integer chain
  for (let attempt = 0; attempt < 20; attempt++) {
    let a: number, b: number, c: number

    // Generate a, b based on op1
    if (op1 === OperatorType.DIV) {
      b = rng.nextInt(2, 6)
      const mid = rng.nextInt(2, 12)
      a = b * mid
    } else if (op1 === OperatorType.SUB) {
      a = rng.nextInt(5, 25)
      b = rng.nextInt(1, a - 1)
    } else {
      a = rng.nextInt(2, 10)
      b = rng.nextInt(2, 10)
    }

    const mid = applyOp(a, b, op1)
    if (!Number.isInteger(mid)) continue

    // Generate c based on op2
    if (op2 === OperatorType.DIV) {
      const divisors = getDivisors(Math.abs(mid)).filter(d => d > 1 && d < Math.abs(mid))
      if (divisors.length === 0) continue
      c = rng.nextItem(divisors)
    } else if (op2 === OperatorType.SUB) {
      if (mid < 2) continue
      c = rng.nextInt(1, mid - 1)
    } else {
      c = rng.nextInt(2, 10)
    }

    const result = applyOp(mid, c, op2)
    if (!Number.isInteger(result)) continue

    return { a, b, c, mid, result }
  }

  // Fallback: simple addition chain
  const a = rng.nextInt(2, 10)
  const b = rng.nextInt(2, 10)
  const c = rng.nextInt(2, 10)
  return { a, b, c, mid: a + b, result: a + b + c }
}

function getDivisors(n: number): number[] {
  if (n <= 0) return [1]
  const divs: number[] = []
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divs.push(i)
      if (i !== n / i) divs.push(n / i)
    }
  }
  return divs.sort((a, b) => a - b)
}

function makeLevel(
  rng: SeededRNG,
  difficulty: number,
  entities: Entity[],
  result: number,
): LevelDefinition {
  const objectives: Objective[] = [{
    id: 'obj1', receiverId: 'r1',
    description: `Deliver 3 tokens of value ${result}`,
    required: 3, completed: false,
  }]
  return { version: 1, seed: rng.initialSeed, difficulty, entities, objectives }
}
