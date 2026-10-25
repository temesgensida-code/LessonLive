import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AuthGateway from '../src-output/components/AuthGateway'

describe('AuthGateway component', () => {
  it('renders student login by default with proper tab semantics', () => {
    render(<AuthGateway onSuccess={vi.fn()} />)

    const studentTab = screen.getByRole('tab', { name: /student/i })
    const teacherTab = screen.getByRole('tab', { name: /teacher/i })

    expect(studentTab).toHaveAttribute('aria-selected', 'true')
    expect(teacherTab).toHaveAttribute('aria-selected', 'false')

    expect(screen.getByRole('form', { name: /student sign in/i })).toBeInTheDocument()
  })

  it('switches to teacher auth when the teacher tab is clicked', () => {
    render(<AuthGateway onSuccess={vi.fn()} />)

    const teacherTab = screen.getByRole('tab', { name: /teacher/i })
    fireEvent.click(teacherTab)

    expect(teacherTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /student/i })).toHaveAttribute('aria-selected', 'false')

    expect(screen.getByRole('form', { name: /teacher sign in/i })).toBeInTheDocument()
  })

  it('toggles role when inline switch button is clicked', () => {
    render(<AuthGateway onSuccess={vi.fn()} />)

    const switchBtn = screen.getByRole('button', { name: /register or sign in as a teacher/i })
    fireEvent.click(switchBtn)

    expect(screen.getByRole('form', { name: /teacher sign in/i })).toBeInTheDocument()
  })
})
