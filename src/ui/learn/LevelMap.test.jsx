import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LevelMap from './LevelMap.jsx'

const progress = { stars: { 1: 3, 2: 1, 3: 2 }, current: 4 }

describe('LevelMap', () => {
  it('shows 5 world rows', () => {
    render(<LevelMap progress={progress} onOpen={vi.fn()} />)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
  })

  it('with current 4: levels 1-4 enabled, 5-15 disabled', () => {
    render(<LevelMap progress={progress} onOpen={vi.fn()} />)
    for (let id = 1; id <= 15; id++) {
      const node = screen.getByRole('button', { name: new RegExp(`^Level ${id},`) })
      if (id <= 4) expect(node).toBeEnabled()
      else expect(node).toBeDisabled()
    }
  })

  it('names nodes with stars, current and locked', () => {
    render(<LevelMap progress={progress} onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Level 3, Tick-tock, 2 stars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Level 2, Clap back, 1 star' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Level 4, current' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Level 6, locked' })).toBeInTheDocument()
  })

  it('opens a level and goes back', () => {
    const onOpen = vi.fn()
    const onBack = vi.fn()
    render(<LevelMap progress={progress} onOpen={onOpen} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: 'Level 4, current' }))
    expect(onOpen).toHaveBeenCalledWith(4)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows the Graduate badge once level 15 has stars', () => {
    const { rerender } = render(<LevelMap progress={progress} onOpen={vi.fn()} />)
    expect(screen.queryByText('🎓 Graduate')).toBeNull()
    rerender(<LevelMap progress={{ stars: { ...progress.stars, 15: 1 }, current: 15 }} onOpen={vi.fn()} />)
    expect(screen.getByText('🎓 Graduate')).toBeInTheDocument()
  })
})

