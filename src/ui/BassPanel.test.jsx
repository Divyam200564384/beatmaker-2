import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BassPanel from './BassPanel.jsx'
import { createDefaultSong } from '../song/model.js'

describe('BassPanel', () => {
  it('clicking Walking commits style walking', () => {
    const song = createDefaultSong()
    const commit = vi.fn()
    render(<BassPanel song={song} commit={commit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Walking' }))
    expect(commit.mock.calls[0][0](song).bass.style).toBe('walking')
  })

  it('explains the bass and marks the current style', () => {
    render(<BassPanel song={createDefaultSong()} commit={vi.fn()} />)
    expect(screen.getByText('The bass plays the bottom note of your chords.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lock to kick' }).getAttribute('aria-pressed')).toBe('true')
  })
})
