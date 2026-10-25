import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RhythmRings from './RhythmRings.jsx'
import { createDefaultSong } from '../song/model.js'
import { euclid } from '../music/euclid.js'

const setup = (props = {}) => {
  const p = {
    song: createDefaultSong(), commit: vi.fn(), preview: vi.fn(), onSound: vi.fn(),
    step: null, tools: null, hint: null, ...props,
  }
  render(<RhythmRings {...p} />)
  return p
}

describe('RhythmRings', () => {
  it('renders 64 dot buttons when all tools are shown', () => {
    setup()
    expect(screen.getAllByRole('button', { name: /step \d+, (on|off)/ })).toHaveLength(64)
  })

  it('clicking Kick step 2, off commits a toggle', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Kick step 2, off' }))
    expect(p.commit).toHaveBeenCalledTimes(1)
    const next = p.commit.mock.calls[0][0](p.song)
    expect(next.drums.rings.kick.pattern[1]).toBe(true)
    expect(p.onSound).toHaveBeenCalledWith('drums', 'kick')
  })

  it('Enter key toggles a dot and turning off makes no sound', () => {
    const p = setup()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Kick step 1, on' }), { key: 'Enter' })
    expect(p.commit).toHaveBeenCalledTimes(1)
    expect(p.onSound).not.toHaveBeenCalled()
  })

  it('hits slider change commits euclid(3,16,0)', () => {
    const p = setup()
    const slider = screen.getByRole('slider', { name: /kick hits/i })
    fireEvent.change(slider, { target: { value: '3' } })
    const next = p.commit.mock.calls[0][0](p.song)
    expect(next.drums.rings.kick.pattern).toEqual(euclid(3, 16, 0))
  })

  it('hits slider input previews', () => {
    const p = setup()
    fireEvent.input(screen.getByRole('slider', { name: /snare hits/i }), { target: { value: '5' } })
    expect(p.preview).toHaveBeenCalled()
  })

  it('only kick tool shows 16 dots and no shift slider', () => {
    setup({ tools: new Set(['kick']) })
    expect(screen.getAllByRole('button', { name: /step \d+, (on|off)/ })).toHaveLength(16)
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('sliders tool shows hits but not shift', () => {
    setup({ tools: new Set(['kick', 'sliders']) })
    expect(screen.getByRole('slider', { name: /kick hits/i })).toBeTruthy()
    expect(screen.queryByRole('slider', { name: /shift/i })).toBeNull()
  })

  it('ignores repeated keydown events', () => {
    const p = setup()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Kick step 2, off' }), { key: 'Enter', repeat: true })
    expect(p.commit).not.toHaveBeenCalled()
  })

  it('shows sample labels with closest-sound note', () => {
    setup({ ringSamples: { kick: { name: 'bd01', exact: true }, snare: { name: 'sd02', exact: false } } })
    expect(screen.getByText('bd01')).toBeTruthy()
    expect(screen.getByText(/sd02/).textContent).toMatch(/closest sound/)
  })

  it('perc select changes perc', () => {
    const p = setup()
    fireEvent.change(screen.getByLabelText(/percussion sound/i), { target: { value: 'tom' } })
    expect(p.commit.mock.calls[0][0](p.song).drums.perc).toBe('tom')
  })
})
