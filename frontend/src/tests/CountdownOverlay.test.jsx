import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CountdownOverlay from '../src-output/components/CountdownOverlay'

describe('CountdownOverlay component', () => {
  const sampleNotification = {
    id: 101,
    message: 'Break ends soon, please return to seats!',
    countdown_seconds: 120,
    total_seconds: 120,
    created_at: new Date().toISOString(),
  }

  it('renders dialog with accessible attributes and message', () => {
    const handleClose = vi.fn()
    render(<CountdownOverlay notification={sampleNotification} onClose={handleClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Break ends soon, please return to seats!')).toBeInTheDocument()
  })

  it('closes when close button is clicked', () => {
    const handleClose = vi.fn()
    render(<CountdownOverlay notification={sampleNotification} onClose={handleClose} />)

    const closeBtn = screen.getByRole('button', { name: /close countdown modal/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('closes when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(<CountdownOverlay notification={sampleNotification} onClose={handleClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
