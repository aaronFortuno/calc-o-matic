import { describe, it, expect } from 'vitest'
import { evaluateOperator } from '../../engine/entities/operator'
import { OperatorType } from '../../engine/entities/types'

describe('evaluateOperator', () => {
  // -------------------------------------------------------------------------
  // ADD
  // -------------------------------------------------------------------------
  describe('ADD', () => {
    it('adds two positive numbers', () => {
      expect(evaluateOperator(OperatorType.ADD, [3, 4])).toEqual([7])
    })
    it('adds zeros', () => {
      expect(evaluateOperator(OperatorType.ADD, [0, 0])).toEqual([0])
    })
    it('handles negative inputs', () => {
      expect(evaluateOperator(OperatorType.ADD, [-1, 5])).toEqual([4])
    })
  })

  // -------------------------------------------------------------------------
  // SUB
  // -------------------------------------------------------------------------
  describe('SUB', () => {
    it('subtracts smaller from larger', () => {
      expect(evaluateOperator(OperatorType.SUB, [10, 3])).toEqual([7])
    })
    it('produces negative result', () => {
      expect(evaluateOperator(OperatorType.SUB, [3, 10])).toEqual([-7])
    })
  })

  // -------------------------------------------------------------------------
  // MUL
  // -------------------------------------------------------------------------
  describe('MUL', () => {
    it('multiplies two numbers', () => {
      expect(evaluateOperator(OperatorType.MUL, [6, 7])).toEqual([42])
    })
    it('multiply by zero', () => {
      expect(evaluateOperator(OperatorType.MUL, [0, 99])).toEqual([0])
    })
  })

  // -------------------------------------------------------------------------
  // DIV
  // -------------------------------------------------------------------------
  describe('DIV', () => {
    it('divides evenly', () => {
      expect(evaluateOperator(OperatorType.DIV, [10, 2])).toEqual([5])
    })
    it('returns empty on divide-by-zero', () => {
      expect(evaluateOperator(OperatorType.DIV, [10, 0])).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // SQUARE
  // -------------------------------------------------------------------------
  describe('SQUARE', () => {
    it('squares a positive number', () => {
      expect(evaluateOperator(OperatorType.SQUARE, [5])).toEqual([25])
    })
    it('squares zero', () => {
      expect(evaluateOperator(OperatorType.SQUARE, [0])).toEqual([0])
    })
  })

  // -------------------------------------------------------------------------
  // SQRT
  // -------------------------------------------------------------------------
  describe('SQRT', () => {
    it('square root of perfect square', () => {
      expect(evaluateOperator(OperatorType.SQRT, [9])).toEqual([3])
    })
    it('square root of non-perfect square', () => {
      const result = evaluateOperator(OperatorType.SQRT, [2])
      expect(result).toHaveLength(1)
      expect(result[0]).toBeCloseTo(1.414, 3)
    })
    it('returns empty for negative input', () => {
      expect(evaluateOperator(OperatorType.SQRT, [-1])).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // POWER
  // -------------------------------------------------------------------------
  describe('POWER', () => {
    it('computes power', () => {
      expect(evaluateOperator(OperatorType.POWER, [2, 10])).toEqual([1024])
    })
    it('zero to the zero is 1', () => {
      expect(evaluateOperator(OperatorType.POWER, [0, 0])).toEqual([1])
    })
  })

  // -------------------------------------------------------------------------
  // MOD
  // -------------------------------------------------------------------------
  describe('MOD', () => {
    it('computes modulo with remainder', () => {
      expect(evaluateOperator(OperatorType.MOD, [10, 3])).toEqual([1])
    })
    it('computes modulo with no remainder', () => {
      expect(evaluateOperator(OperatorType.MOD, [9, 3])).toEqual([0])
    })
    it('returns empty on mod-by-zero', () => {
      expect(evaluateOperator(OperatorType.MOD, [10, 0])).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // GCD
  // -------------------------------------------------------------------------
  describe('GCD', () => {
    it('computes GCD of two numbers', () => {
      expect(evaluateOperator(OperatorType.GCD, [12, 8])).toEqual([4])
    })
    it('returns 1 for coprime numbers', () => {
      expect(evaluateOperator(OperatorType.GCD, [7, 13])).toEqual([1])
    })
  })

  // -------------------------------------------------------------------------
  // FACTOR
  // -------------------------------------------------------------------------
  describe('FACTOR', () => {
    it('factors a composite number', () => {
      expect(evaluateOperator(OperatorType.FACTOR, [12])).toEqual([2, 2, 3])
    })
    it('returns empty for 1', () => {
      expect(evaluateOperator(OperatorType.FACTOR, [1])).toEqual([])
    })
    it('returns the prime itself for a prime input', () => {
      expect(evaluateOperator(OperatorType.FACTOR, [7])).toEqual([7])
    })
  })

  // -------------------------------------------------------------------------
  // IS_PRIME
  // -------------------------------------------------------------------------
  describe('IS_PRIME', () => {
    it('returns 1 for a prime', () => {
      expect(evaluateOperator(OperatorType.IS_PRIME, [7])).toEqual([1])
    })
    it('returns 0 for a composite', () => {
      expect(evaluateOperator(OperatorType.IS_PRIME, [4])).toEqual([0])
    })
    it('returns 0 for 1', () => {
      expect(evaluateOperator(OperatorType.IS_PRIME, [1])).toEqual([0])
    })
    it('returns 1 for 2', () => {
      expect(evaluateOperator(OperatorType.IS_PRIME, [2])).toEqual([1])
    })
    it('handles large prime', () => {
      expect(evaluateOperator(OperatorType.IS_PRIME, [999983])).toEqual([1])
    })
  })
})
