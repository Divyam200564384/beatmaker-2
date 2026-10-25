import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChordPanel from './ChordPanel.jsx'
import { createDefaultSong } from '../song/model.js'
import { chordNotes } from '../music/theory.js'

const setup = (props = {}) => {
  const p = { song: createDefaultSong(), commit: vi.fn(), preview: vi.fn(), onSound: vi.fn(), step: null, tools: null, ...props }
  render(<ChordPanel {...p} />)
  return p
}

describe('ChordPanel', () => {
  it('bar 3 then Em thoughtful sets prog[2] to iii and plays it', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: /^bar 3/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Em thoughtful' }))
    const next = p.commit.mock.calls[0][0](p.song)
    expect(next.chords.prog[2]).toBe('iii')
    expect(p.onSound).toHaveBeenCalledWith('chords', chordNotes('iii', 0))
  })

  it('selection moves to the next bar after a pick', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Em thoughtful' }))
    fireEvent.click(screen.getByRole('button', { name: 'Em thoughtful' }))
    expect(p.commit.mock.calls[0][0](p.song).chords.prog[0]).toBe('iii')
    expect(p.commit.mock.calls[1][0](p.song).chords.prog[1]).toBe('iii')
  })

  it('shows 3 stars when bar 2 is selected after I', () => {
    setup({ tools: new Set(['chords', 'suggest']) })
    fireEvent.click(screen.getByRole('button', { name: /^bar 2/ }))
    expect(screen.getAllByText('★')).toHaveLength(3)
  })

  it('no stars without the suggest tool', () => {
    setup({ tools: new Set(['chords']) })
    expect(screen.queryAllByText('★')).toHaveLength(0)
  })

  it('hides maj7 chords without the maj7 tool', () => {
    setup({ tools: new Set(['chords']) })
    expect(screen.queryByRole('button', { name: /^Cmaj7/ })).toBeNull()
  })

  it('shows maj7 chords with the tool', () => {
    setup()
    expect(screen.getByRole('button', { name: /^Cmaj7/ })).toBeTruthy()
  })

  it('No chord sets null', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'No chord' }))
    expect(p.commit.mock.calls[0][0](p.song).chords.prog[0]).toBeNull()
  })

  it('rhythm control commits and is gated by tool', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Strum' }))
    expect(p.commit.mock.calls[0][0](p.song).chords.rhythm).toBe('strum')
  })

  it('no rhythm control without the tool', () => {
    setup({ tools: new Set(['chords']) })
    expect(screen.queryByRole('button', { name: 'Strum' })).toBeNull()
  })

  it('highlights the current bar', () => {
    setup({ step: 20 })
    expect(screen.getByRole('button', { name: /^bar 2/ }).className).toContain('playing')
  })
})
