import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../src-output/components/Layout'

describe('Layout component', () => {
  it('renders the skip-to-main-content accessible link', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    )

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('renders main content area with id="main-content" and tabIndex="-1"', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    )

    const mainElement = screen.getByRole('main')
    expect(mainElement).toHaveAttribute('id', 'main-content')
    expect(mainElement).toHaveAttribute('tabIndex', '-1')
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('manages sidebar drawer toggle and Escape key dismissal when logged in', () => {
    render(
      <MemoryRouter>
        <Layout me={{ authenticated: true, email: 'teacher@school.edu', role: 'teacher' }}>
          <div>Classroom View</div>
        </Layout>
      </MemoryRouter>
    )

    const toggleBtn = screen.getByRole('button', { name: /open sidebar menu/i })
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    // Click to open sidebar
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')

    const closeBtn = screen.getByRole('button', { name: /close menu/i })
    expect(closeBtn).toBeInTheDocument()

    // Press Escape to dismiss drawer
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
  })
})
