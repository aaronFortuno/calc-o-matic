import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorialModal } from '../../components/TutorialModal'
import { useUiStore } from '../../store/uiStore'
import '../../i18n'

describe('TutorialModal', () => {
  beforeEach(() => {
    localStorage.clear()
    // Force tutorial visible
    useUiStore.setState({ tutorialVisible: true, tutorialStep: 0 })
  })

  it('renders on first run', () => {
    render(<TutorialModal />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when tutorialVisible is false', () => {
    useUiStore.setState({ tutorialVisible: false })
    const { container } = render(<TutorialModal />)
    expect(container.innerHTML).toBe('')
  })

  it('shows step 1 title on first render', () => {
    render(<TutorialModal />)
    expect(screen.getByText(/welcome to calc-o-matic/i)).toBeInTheDocument()
  })

  it('Next button advances to step 2', async () => {
    const user = userEvent.setup()
    render(<TutorialModal />)
    const nextBtn = screen.getByRole('button', { name: /next/i })
    await user.click(nextBtn)
    expect(useUiStore.getState().tutorialStep).toBe(1)
  })

  it('Skip button closes modal and sets tutorialSeen', async () => {
    const user = userEvent.setup()
    render(<TutorialModal />)
    const skipBtn = screen.getByRole('button', { name: /skip/i })
    await user.click(skipBtn)
    expect(useUiStore.getState().tutorialVisible).toBe(false)
    expect(localStorage.getItem('calc-o-matic:tutorialSeen')).toBe('1')
  })

  it('last step shows Finish button', () => {
    useUiStore.setState({ tutorialStep: 2 })
    render(<TutorialModal />)
    expect(screen.getByRole('button', { name: /let's go/i })).toBeInTheDocument()
  })

  it('Finish closes modal', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ tutorialStep: 2 })
    render(<TutorialModal />)
    const finishBtn = screen.getByRole('button', { name: /let's go/i })
    await user.click(finishBtn)
    expect(useUiStore.getState().tutorialVisible).toBe(false)
  })
})
