// =============================================================================
// operator.ts — Operator base class, all implementations, registry, factory.
//
// To add a new operator:
//   1. Add its value to OperatorType in types.ts
//   2. Set its arity in OPERATOR_ARITY in types.ts
//   3. Extend BaseOperator here and register the instance in OPERATOR_REGISTRY
//   4. Add unlock threshold in playerStore (Phase 5)
//   5. Add i18n keys in en.json (Phase 4)
//   6. Add unit tests in operator.test.ts (Phase 7)
// =============================================================================

import { EntityType, ConveyorDirection, OPERATOR_ARITY, OperatorType } from './types'
import type { Entity, OperatorData, TileCoord } from './types'

// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------

/**
 * All operator implementations extend this class.
 * `arity` is derived automatically from OPERATOR_ARITY; only `evaluate`
 * must be implemented by each subclass.
 */
export abstract class BaseOperator {
  abstract readonly type: OperatorType

  /** How many input tokens this operator consumes per operation. */
  get arity(): number {
    return OPERATOR_ARITY[this.type]
  }

  /**
   * Compute output values from filled inputs.
   * - Return a single-element array for normal operators.
   * - Return a multi-element array (FACTOR) to emit several tokens in sequence.
   * - Return an empty array to emit no token (e.g. DIV by zero).
   */
  abstract evaluate(inputs: number[]): number[]
}

// ---------------------------------------------------------------------------
// Basic operators — unlocked from the start
// ---------------------------------------------------------------------------

export class AddOperator extends BaseOperator {
  readonly type = OperatorType.ADD
  evaluate(inputs: number[]): number[] { return [inputs[0] + inputs[1]] }
}

export class SubOperator extends BaseOperator {
  readonly type = OperatorType.SUB
  evaluate(inputs: number[]): number[] { return [inputs[0] - inputs[1]] }
}

export class MulOperator extends BaseOperator {
  readonly type = OperatorType.MUL
  evaluate(inputs: number[]): number[] { return [inputs[0] * inputs[1]] }
}

export class DivOperator extends BaseOperator {
  readonly type = OperatorType.DIV
  /** Emits no token when dividing by zero (silent discard). */
  evaluate(inputs: number[]): number[] {
    return inputs[1] !== 0 ? [inputs[0] / inputs[1]] : []
  }
}

// ---------------------------------------------------------------------------
// Advanced operators — unlocked via player progression
// ---------------------------------------------------------------------------

export class PowerOperator extends BaseOperator {
  readonly type = OperatorType.POWER
  evaluate(inputs: number[]): number[] { return [Math.pow(inputs[0], inputs[1])] }
}

export class ModOperator extends BaseOperator {
  readonly type = OperatorType.MOD
  /** Floored modulo — result is always non-negative. Emits [] on mod-by-zero. */
  evaluate(inputs: number[]): number[] {
    if (inputs[1] === 0) return []
    return [((inputs[0] % inputs[1]) + inputs[1]) % inputs[1]]
  }
}

export class GcdOperator extends BaseOperator {
  readonly type = OperatorType.GCD
  evaluate(inputs: number[]): number[] {
    return [gcd(Math.abs(Math.round(inputs[0])), Math.abs(Math.round(inputs[1])))]
  }
}

export class SquareOperator extends BaseOperator {
  readonly type = OperatorType.SQUARE
  evaluate(inputs: number[]): number[] { return [inputs[0] * inputs[0]] }
}

export class SqrtOperator extends BaseOperator {
  readonly type = OperatorType.SQRT
  /** Emits no token for negative inputs. */
  evaluate(inputs: number[]): number[] {
    return inputs[0] >= 0 ? [Math.sqrt(inputs[0])] : []
  }
}

export class FactorOperator extends BaseOperator {
  readonly type = OperatorType.FACTOR
  /**
   * Emits prime factors as multiple tokens in ascending order.
   * E.g. FACTOR(12) → outputQueue [2, 2, 3] → three sequential tokens.
   */
  evaluate(inputs: number[]): number[] {
    return primeFactors(Math.abs(Math.round(inputs[0])))
  }
}

export class IsPrimeOperator extends BaseOperator {
  readonly type = OperatorType.IS_PRIME
  /** Emits 1 if the input is prime, 0 otherwise. */
  evaluate(inputs: number[]): number[] {
    return [isPrime(Math.abs(Math.round(inputs[0]))) ? 1 : 0]
  }
}

// ---------------------------------------------------------------------------
// Operator registry — single instance per type
// ---------------------------------------------------------------------------

export const OPERATOR_REGISTRY: Record<OperatorType, BaseOperator> = {
  [OperatorType.ADD]:      new AddOperator(),
  [OperatorType.SUB]:      new SubOperator(),
  [OperatorType.MUL]:      new MulOperator(),
  [OperatorType.DIV]:      new DivOperator(),
  [OperatorType.POWER]:    new PowerOperator(),
  [OperatorType.MOD]:      new ModOperator(),
  [OperatorType.GCD]:      new GcdOperator(),
  [OperatorType.SQUARE]:   new SquareOperator(),
  [OperatorType.SQRT]:     new SqrtOperator(),
  [OperatorType.FACTOR]:   new FactorOperator(),
  [OperatorType.IS_PRIME]: new IsPrimeOperator(),
}

/**
 * Evaluate an operator by type.  Delegates to OPERATOR_REGISTRY.
 * This is the function imported by tick.ts and used in operator.test.ts.
 */
export function evaluateOperator(type: OperatorType, inputs: number[]): number[] {
  return OPERATOR_REGISTRY[type].evaluate(inputs)
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create an Operator entity with all slots empty and the engine in idle state.
 *
 * @param processingDelay  Ticks between inputs being consumed and the output
 *                         token being enqueued.  Default 1.
 */
export function createOperator(
  id:              string,
  position:        TileCoord,
  type:            OperatorType,
  outputDirection: ConveyorDirection = ConveyorDirection.RIGHT,
  processingDelay = 1,
): Entity {
  const arity = OPERATOR_ARITY[type]
  const data: OperatorData = {
    type,
    outputDirection,
    inputSlots:      new Array<number | null>(arity).fill(null),
    processingDelay: Math.max(0, processingDelay),
    ticksRemaining:  -1,
    outputQueue:     [],
  }
  return { id, type: EntityType.OPERATOR, position, data }
}

// ---------------------------------------------------------------------------
// Math helpers (private to this module)
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  while (b !== 0) { [a, b] = [b, a % b] }
  return a
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false
  }
  return true
}

function primeFactors(n: number): number[] {
  if (n <= 1) return []
  const factors: number[] = []
  let d = 2
  while (d * d <= n) {
    while (n % d === 0) { factors.push(d); n = Math.round(n / d) }
    d++
  }
  if (n > 1) factors.push(n)
  return factors
}
