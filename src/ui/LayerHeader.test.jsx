import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import LayerHeader from './LayerHeader.jsx'
import { createDefaultSong } from '../song/model.js'

function Harness(props) {
  const [song, setSong] = useState(createDefaultSong())
  return <LayerHeader layer="chords" title="Chords" song={song} commit={(fn) => setSong(fn)} preview={vi.fn()} {...props} />
}

describe('LayerHeader', () => {
  it('mute toggles aria-pressed', () => {
    render(<Harness />)
    const mute = screen.getByRole('button', { name: /mute/i })
    expect(mute.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(mute)
    expect(mute.getAttribute('aria-pressed')).toBe('true')
  })

  it('options restricts instrument list to one option', () => {
    render(<Harness options={['electric_piano_1']} />)
    expect(screen.getAllByRole('option')).toHaveLength(1)
  })

  it('groups instruments by category', () => {
    const { container } = render(<Harness />)
    expect(container.querySelectorAll('optgroup').length).toBeGreaterThan(5)
  })

  it('drums lists kits and calls setKit', () => {
    const commit = vi.fn()
    const song = createDefaultSong()
    render(<LayerHeader layer="drums" title="Drums" song={song} commit={commit} preview={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/kit/i), { target: { value: 'LM-2' } })
    expect(commit.mock.calls[0][0](song).drums.kit).toBe('LM-2')
  })

  it('error status shows Retry', () => {
    const onRetry = vi.fn()
    render(<Harness status={{ state: 'error', message: 'Could not load' }} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('loading status shows percent', () => {
    render(<Harness status={{ state: 'loading', progress: 0.4 }} />)
    expect(screen.getByText('Loading… 40%')).toBeTruthy()
  })

  it('mixer tool hides volume, solo, space but keeps mute', () => {
    render(<Harness tools={new Set(['instruments'])} />)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByRole('button', { name: /solo/i })).toBeNull()
    expect(screen.getByRole('button', { name: /mute/i })).toBeTruthy()
  })
})
