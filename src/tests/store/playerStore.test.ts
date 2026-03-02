import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore, XP_PER_OBJECTIVE } from '../../store/playerStore'
import { OperatorType } from '../../engine/entities/types'

describe('playerStore', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.getState().resetPlayer()
  })

  it('starts with 0 XP and level 1', () => {
    const { xp, level } = usePlayerStore.getState()
    expect(xp).toBe(0)
    expect(level).toBe(1)
  })

  it('initially unlocks ADD and MUL (0 XP threshold)', () => {
    const { unlockedOperators } = usePlayerStore.getState()
    expect(unlockedOperators).toContain(OperatorType.ADD)
    expect(unlockedOperators).toContain(OperatorType.MUL)
  })

  it('awardXP increments xp correctly', () => {
    usePlayerStore.getState().awardXP(100)
    expect(usePlayerStore.getState().xp).toBe(100)
  })

  it('awardXP recomputes level', () => {
    usePlayerStore.getState().awardXP(250) // level = floor(250/100) + 1 = 3
    expect(usePlayerStore.getState().level).toBe(3)
  })

  it('XP reaching threshold unlocks operator', () => {
    // SUB unlocks at 50 XP
    usePlayerStore.getState().awardXP(50)
    expect(usePlayerStore.getState().unlockedOperators).toContain(OperatorType.SUB)
  })

  it('does not unlock operators below threshold', () => {
    usePlayerStore.getState().awardXP(49)
    expect(usePlayerStore.getState().unlockedOperators).not.toContain(OperatorType.SUB)
  })

  it('completeLevel adds level id', () => {
    usePlayerStore.getState().completeLevel('tutorial-1')
    expect(usePlayerStore.getState().completedLevels).toContain('tutorial-1')
  })

  it('completeLevel does not duplicate', () => {
    usePlayerStore.getState().completeLevel('tutorial-1')
    usePlayerStore.getState().completeLevel('tutorial-1')
    const count = usePlayerStore.getState().completedLevels.filter(l => l === 'tutorial-1').length
    expect(count).toBe(1)
  })

  it('resetPlayer reverts to initial state', () => {
    usePlayerStore.getState().awardXP(500)
    usePlayerStore.getState().completeLevel('test')
    usePlayerStore.getState().resetPlayer()
    const { xp, level, completedLevels } = usePlayerStore.getState()
    expect(xp).toBe(0)
    expect(level).toBe(1)
    expect(completedLevels).toHaveLength(0)
  })

  it('XP_PER_OBJECTIVE constant is 25', () => {
    expect(XP_PER_OBJECTIVE).toBe(25)
  })
})
