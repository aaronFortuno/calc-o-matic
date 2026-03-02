import { describe, it, expect } from 'vitest'
import en from '../../i18n/en.json'

/** Recursively collect all leaf string values from a nested object. */
function collectLeaves(obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: unknown }> {
  const results: Array<{ key: string; value: unknown }> = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      results.push(...collectLeaves(v as Record<string, unknown>, fullKey))
    } else {
      results.push({ key: fullKey, value: v })
    }
  }
  return results
}

describe('i18n translations (en.json)', () => {
  const leaves = collectLeaves(en)

  it('has at least one translation key', () => {
    expect(leaves.length).toBeGreaterThan(0)
  })

  it('every leaf value is a non-empty string', () => {
    for (const leaf of leaves) {
      expect(typeof leaf.value).toBe('string')
      expect((leaf.value as string).length).toBeGreaterThan(0)
    }
  })

  it('contains critical top-level sections', () => {
    const topKeys = Object.keys(en)
    expect(topKeys).toContain('game')
    expect(topKeys).toContain('toolbar')
    expect(topKeys).toContain('hud')
    expect(topKeys).toContain('tutorial')
    expect(topKeys).toContain('simulation')
    expect(topKeys).toContain('levels')
    expect(topKeys).toContain('levelComplete')
  })

  it('toolbar.tools has entries for all expected tools', () => {
    const tools = (en as unknown as Record<string, Record<string, Record<string, string>>>).toolbar.tools
    const expected = [
      'extractor', 'conveyor', 'eraser',
      'ADD', 'SUB', 'MUL', 'DIV', 'POWER', 'MOD', 'GCD', 'SQUARE', 'SQRT', 'FACTOR', 'IS_PRIME',
    ]
    for (const t of expected) {
      expect(tools[t]).toBeDefined()
    }
  })
})
