import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HUD } from '../../components/HUD'
import { useWorldStore } from '../../store/worldStore'
import { usePlayerStore } from '../../store/playerStore'
import '../../i18n'

describe('HUD', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.getState().resetPlayer()
    useWorldStore.getState().loadCatalogLevel('tutorial-1')
  })

  it('displays objectives', () => {
    render(<HUD />)
    // Tutorial 1 objective should be visible
    expect(screen.getByText(/deliver 3 tokens/i)).toBeInTheDocument()
  })

  it('displays XP', () => {
    render(<HUD />)
    expect(screen.getByText(/0 XP/i)).toBeInTheDocument()
  })

  it('displays level', () => {
    render(<HUD />)
    expect(screen.getByText(/level 1/i)).toBeInTheDocument()
  })

  it('displays current level name', () => {
    render(<HUD />)
    expect(screen.getByText(/tutorial 1/i)).toBeInTheDocument()
  })

  it('displays Start button when not running', () => {
    render(<HUD />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  it('updates XP display reactively', () => {
    const { rerender } = render(<HUD />)
    usePlayerStore.getState().awardXP(50)
    rerender(<HUD />)
    expect(screen.getByText(/50 XP/i)).toBeInTheDocument()
  })
})
