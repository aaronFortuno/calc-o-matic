// =============================================================================
// uiStore.ts — Transient UI state: selected tool, panel visibility, tutorial.
//
// Not persisted — resets to defaults on every page load.
// =============================================================================

import { create } from 'zustand'
import type { ToolType } from '../engine/entities/types'

// Re-export ToolType so existing imports from uiStore keep working
export type { ToolType } from '../engine/entities/types'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface UiState {
  selectedTool:    ToolType
  adminOpen:       boolean
  tutorialVisible: boolean
  tutorialStep:    number   // 0-indexed; max = TUTORIAL_STEPS - 1
  levelSelectOpen: boolean

  // Actions
  selectTool:         (tool: ToolType) => void
  openAdmin:          () => void
  closeAdmin:         () => void
  showTutorial:       () => void
  hideTutorial:       () => void
  nextTutorialStep:   () => void
  skipTutorial:       () => void
  openLevelSelect:    () => void
  closeLevelSelect:   () => void
}

export const TUTORIAL_STEPS = 3

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const TUTORIAL_SEEN_KEY = 'calc-o-matic:tutorialSeen'

export const useUiStore = create<UiState>()((set) => ({
  selectedTool:    'conveyor',
  adminOpen:       false,
  tutorialVisible: !localStorage.getItem(TUTORIAL_SEEN_KEY),
  tutorialStep:    0,
  levelSelectOpen: false,

  selectTool(tool) {
    set({ selectedTool: tool })
  },

  openAdmin() {
    set({ adminOpen: true })
  },

  closeAdmin() {
    set({ adminOpen: false })
  },

  showTutorial() {
    set({ tutorialVisible: true, tutorialStep: 0 })
  },

  hideTutorial() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
    set({ tutorialVisible: false })
  },

  nextTutorialStep() {
    set((s) => {
      const next = s.tutorialStep + 1
      if (next >= TUTORIAL_STEPS) {
        localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
        return { tutorialVisible: false, tutorialStep: 0 }
      }
      return { tutorialStep: next }
    })
  },

  skipTutorial() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1')
    set({ tutorialVisible: false, tutorialStep: 0 })
  },

  openLevelSelect() {
    set({ levelSelectOpen: true })
  },

  closeLevelSelect() {
    set({ levelSelectOpen: false })
  },
}))
