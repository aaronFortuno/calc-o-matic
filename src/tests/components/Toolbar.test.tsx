import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from '../../components/Toolbar'
import { useUiStore } from '../../store/uiStore'
import { usePlayerStore } from '../../store/playerStore'
import '../../i18n'

describe('Toolbar', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.getState().resetPlayer()
    useUiStore.getState().selectTool('conveyor')
  })

  it('renders basic tools as enabled buttons', () => {
    render(<Toolbar />)
    const extractorBtn = screen.getByRole('button', { name: /extractor/i })
    const conveyorBtn  = screen.getByRole('button', { name: /conveyor/i })
    const eraserBtn    = screen.getByRole('button', { name: /eraser/i })
    expect(extractorBtn).not.toBeDisabled()
    expect(conveyorBtn).not.toBeDisabled()
    expect(eraserBtn).not.toBeDisabled()
  })

  it('renders locked operators as disabled', () => {
    render(<Toolbar />)
    // SUB requires 50 XP — should be disabled at 0 XP
    const subBtn = screen.getByRole('button', { name: /subtract/i })
    expect(subBtn).toBeDisabled()
  })

  it('renders unlocked operators as enabled', () => {
    render(<Toolbar />)
    // ADD is unlocked at 0 XP
    const addBtn = screen.getByRole('button', { name: /add/i })
    expect(addBtn).not.toBeDisabled()
  })

  it('clicking an unlocked tool updates selectedTool', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    const extractorBtn = screen.getByRole('button', { name: /extractor/i })
    await user.click(extractorBtn)
    expect(useUiStore.getState().selectedTool).toBe('extractor')
  })

  it('unlocking operators re-enables buttons', () => {
    // Award enough XP to unlock SUB (50)
    usePlayerStore.getState().awardXP(50)
    render(<Toolbar />)
    const subBtn = screen.getByRole('button', { name: /subtract/i })
    expect(subBtn).not.toBeDisabled()
  })
})
