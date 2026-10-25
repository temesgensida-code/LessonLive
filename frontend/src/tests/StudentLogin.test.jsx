import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StudentLogin from '../src-output/components/StudentLogin'

describe('StudentLogin component', () => {
  it('renders email and password inputs with proper associations', () => {
    render(<StudentLogin onSuccess={vi.fn()} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('switches to forgot password mode and back', () => {
    render(<StudentLogin onSuccess={vi.fn()} />)

    const forgotBtn = screen.getByRole('button', { name: /forgot password\?/i })
    fireEvent.click(forgotBtn)

    expect(screen.getByRole('form', { name: /student password reset/i })).toBeInTheDocument()

    const backBtn = screen.getByRole('button', { name: /back to sign in/i })
    fireEvent.click(backBtn)

    expect(screen.getByRole('form', { name: /student sign in/i })).toBeInTheDocument()
  })
})
