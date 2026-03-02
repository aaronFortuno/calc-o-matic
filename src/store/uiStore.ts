// =============================================================================
// uiStore.ts — Transient UI state: selected tool, panel visibility, tutorial.
//
// Not persisted — resets to defaults on every page load.
// =============================================================================

import { create } from 'zustand'
import { OperatorType } from '../engine/entities/types'

// ---------------------------------------------------------------------------
// Tool type — what the player currently has selected in the toolbar
// ---------------------------------------------------------------------------

export type ToolType =
  | 'extractor'
  | 'conveyor'
  | 'eraser'
  | OperatorType

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface UiState {
  selectedTool:    ToolType
  adminOpen:       boolean
  tutorialVisible: boolean
  tutorialStep:    number   // 0-indexed; max = TUTORIAL_STEPS - 1

  // Actions
  selectTool:         (tool: ToolType) => void
  openAdmin:          () => void
  closeAdmin:         () => void
  showTutorial:       () => void
  hideTutorial:       () => void
  nextTutorialStep:   () => void
  skipTutorial:       () => void
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
}))
