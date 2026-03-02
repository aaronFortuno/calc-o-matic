import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPanel } from '../../components/AdminPanel'
import { useUiStore } from '../../store/uiStore'
import { useWorldStore } from '../../store/worldStore'
import '../../i18n'

describe('AdminPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({ adminOpen: false })
    // Ensure world store has a level loaded
    useWorldStore.getState().loadCatalogLevel('tutorial-1')
  })

  it('panel is not visible on initial render (only gear button)', () => {
    render(<AdminPanel />)
    expect(screen.getByRole('button', { name: /open admin/i })).toBeInTheDocument()
    expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument()
  })

  it('clicking gear button opens passphrase gate', async () => {
    const user = userEvent.setup()
    render(<AdminPanel />)
    await user.click(screen.getByRole('button', { name: /open admin/i }))
    expect(screen.getByPlaceholderText(/passphrase/i)).toBeInTheDocument()
  })

  it('entering wrong passphrase shows error', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ adminOpen: true })
    render(<AdminPanel />)
    const input = screen.getByPlaceholderText(/passphrase/i)
    await user.type(input, 'wrong')
    await user.click(screen.getByRole('button', { name: /ok/i }))
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument()
  })

  it('entering correct passphrase opens the panel', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ adminOpen: true })
    render(<AdminPanel />)
    const input = screen.getByPlaceholderText(/passphrase/i)
    await user.type(input, 'admin')
    await user.click(screen.getByRole('button', { name: /ok/i }))
    // Panel content should now be visible (seed input, generate button)
    expect(screen.getByText(/generate/i)).toBeInTheDocument()
  })
})
