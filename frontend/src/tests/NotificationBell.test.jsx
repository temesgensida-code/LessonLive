import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import NotificationBell from '../src-output/components/NotificationBell'

describe('NotificationBell component', () => {
  const sampleNotifications = [
    { id: 1, message: 'Class begins in 5 minutes', countdown_seconds: 300, is_read: false },
    { id: 2, message: 'Please review slide 4', countdown_seconds: 0, is_read: true },
  ]

  it('renders notification button with accessible label and badge indicator', () => {
    render(
      <NotificationBell
        notifications={sampleNotifications}
        hasUnread={true}
        onMarkRead={vi.fn()}
        onLaunch={vi.fn()}
      />
    )

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    expect(bellBtn).toBeInTheDocument()
    expect(bellBtn).toHaveAttribute('aria-expanded', 'false')
    expect(bellBtn).toHaveClass('has-unread')
    expect(bellBtn).toHaveAttribute('aria-label', expect.stringContaining('unread'))
  })

  it('opens panel on click and dismisses on Escape key', () => {
    render(
      <NotificationBell
        notifications={sampleNotifications}
        hasUnread={true}
        onMarkRead={vi.fn()}
        onLaunch={vi.fn()}
      />
    )

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    expect(bellBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: /notifications panel/i })).toBeInTheDocument()

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(bellBtn).toHaveAttribute('aria-expanded', 'false')
  })
})
