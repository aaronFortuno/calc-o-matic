// =============================================================================
// playerStore.ts — Player profile: XP, level, operator unlocks, completed levels.
//
// Persisted to localStorage under the key "calc-o-matic:player" via Zustand's
// built-in persist middleware so progress survives page reloads.
// =============================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OperatorType } from '../engine/entities/types'

// ---------------------------------------------------------------------------
// XP thresholds for unlocking each operator
// ---------------------------------------------------------------------------

export const OPERATOR_UNLOCK_XP: Record<OperatorType, number> = {
  [OperatorType.ADD]:      0,     // unlocked from the start
  [OperatorType.MUL]:      0,     // unlocked from the start
  [OperatorType.SUB]:      50,
  [OperatorType.DIV]:      120,
  [OperatorType.SQUARE]:   200,
  [OperatorType.SQRT]:     300,
  [OperatorType.POWER]:    400,
  [OperatorType.MOD]:      500,
  [OperatorType.GCD]:      650,
  [OperatorType.FACTOR]:   800,
  [OperatorType.IS_PRIME]: 1000,
}

/** XP awarded for completing a single objective. */
export const XP_PER_OBJECTIVE = 25

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface PlayerState {
  xp:                number
  level:             number
  unlockedOperators: OperatorType[]
  completedLevels:   string[]       // level ids (seed+difficulty as string key)

  // Actions
  awardXP:        (amount: number) => void
  completeLevel:  (levelId: string) => void
  resetPlayer:    () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeLevel(xp: number): number {
  // Simple level formula: level = floor(xp / 100) + 1 (no hard cap)
  return Math.floor(xp / 100) + 1
}

function computeUnlocked(xp: number): OperatorType[] {
  return (Object.entries(OPERATOR_UNLOCK_XP) as [OperatorType, number][])
    .filter(([, threshold]) => xp >= threshold)
    .map(([type]) => type)
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  xp:                0,
  level:             1,
  unlockedOperators: computeUnlocked(0),
  completedLevels:   [] as string[],
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      ...initialState,

      awardXP(amount) {
        set((s) => {
          const newXp       = s.xp + amount
          const newLevel    = computeLevel(newXp)
          const newUnlocked = computeUnlocked(newXp)
          return { xp: newXp, level: newLevel, unlockedOperators: newUnlocked }
        })
      },

      completeLevel(levelId) {
        set((s) => {
          if (s.completedLevels.includes(levelId)) return s
          return { completedLevels: [...s.completedLevels, levelId] }
        })
      },

      resetPlayer() {
        set({ ...initialState, unlockedOperators: computeUnlocked(0) })
      },
    }),
    {
      name: 'calc-o-matic:player',
    },
  ),
)
