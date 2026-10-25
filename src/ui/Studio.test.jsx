import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import Studio from './Studio.jsx'
import { createDefaultSong } from '../song/model.js'

const engine = { playing: false, toggle: vi.fn(), step: -1, status: {}, preview: vi.fn() }
const base = () => ({ song: createDefaultSong(), commit: vi.fn(), preview: vi.fn(), engine })

function setWidth(w) {
  act(() => {
    window.innerWidth = w
    window.dispatchEvent(new Event('resize'))
  })
}
afterEach(() => setWidth(1024))

describe('Studio', () => {
  it('shows all four panels on a wide screen', () => {
    render(<Studio {...base()} />)
    for (const t of ['Drums', 'Chords', 'Bass', 'Melody']) {
      expect(screen.getByRole('heading', { name: t })).toBeInTheDocument()
    }
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('uses tabs on a phone and switches panels', () => {
    window.innerWidth = 375
    render(<Studio {...base()} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    fireEvent.click(screen.getByRole('tab', { name: /Melody/ }))
    expect(screen.getByRole('heading', { name: 'Melody' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Melody grid/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Drums' })).toBeNull()
  })

  it('reacts to a resize', () => {
    render(<Studio {...base()} />)
    setWidth(375)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('hides layers whose tools are all filtered out', () => {
    window.innerWidth = 375
    render(<Studio {...base()} tools={new Set(['kick'])} />)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.queryByRole('tab', { name: /Chords/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Bass/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Melody/ })).toBeNull()
  })

  it('Retry calls the engine retry for that layer', () => {
    const retry = vi.fn()
    const eng = { ...engine, retry, status: { bass: { layer: 'bass', state: 'error', message: 'x' } } }
    render(<Studio {...base()} engine={eng} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledWith('bass')
  })

  it('shows engine status ahead of the load error', () => {
    const eng = { ...engine, status: { bass: { layer: 'bass', state: 'loading', progress: 0.5 } } }
    render(<Studio {...base()} engine={eng} statusText="Bad link" />)
    expect(screen.getAllByRole('status').some((e) => /Loading… 50%/.test(e.textContent))).toBe(true)
    expect(screen.queryByText('Bad link')).toBeNull()
  })

  it('marks the Menu button expanded', () => {
    render(<Studio {...base()} menuOpen />)
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows hint messages', () => {
    render(<Studio {...base()} hints={['No sound? Check your silent switch.']} />)
    expect(screen.getByText('No sound? Check your silent switch.')).toBeInTheDocument()
  })

  it('emits actions from the panels', async () => {
    const onAction = vi.fn()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
    render(<Studio {...base()} onAction={onAction} />)
    const bass = screen.getByRole('heading', { name: 'Bass' }).closest('header')
    fireEvent.click(within(bass).getByRole('button', { name: 'Mute' }))
    expect(onAction).toHaveBeenLastCalledWith('mute:bass')
    fireEvent.click(within(bass).getByRole('button', { name: 'Solo' }))
    expect(onAction).toHaveBeenLastCalledWith('solo')
    fireEvent.change(within(bass).getByLabelText('Volume'), { target: { value: '30' } })
    expect(onAction).toHaveBeenLastCalledWith('volume')
    fireEvent.change(within(bass).getByLabelText('Space'), { target: { value: '30' } })
    expect(onAction).toHaveBeenLastCalledWith('space')
    fireEvent.change(within(bass).getByLabelText('Instrument'), { target: { value: 'acoustic_bass' } })
    expect(onAction).toHaveBeenLastCalledWith('instrument:bass')
    fireEvent.click(screen.getByRole('button', { name: 'Walking' }))
    expect(onAction).toHaveBeenLastCalledWith('bass-style')
    fireEvent.change(screen.getByLabelText('Hat hits'), { target: { value: '5' } })
    expect(onAction).toHaveBeenLastCalledWith('hat-hits:5')
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(onAction).toHaveBeenLastCalledWith('share'))
  })

  it('emits nothing on a slider preview', () => {
    const onAction = vi.fn()
    render(<Studio {...base()} onAction={onAction} />)
    fireEvent.input(screen.getByLabelText('Hat hits'), { target: { value: '5' } })
    expect(onAction).not.toHaveBeenCalled()
  })

  it('emits unmute when the layer was muted', () => {
    const onAction = vi.fn()
    const song = createDefaultSong()
    song.bass.mix.mute = true
    render(<Studio {...base()} song={song} onAction={onAction} />)
    const bass = screen.getByRole('heading', { name: 'Bass' }).closest('header')
    fireEvent.click(within(bass).getByRole('button', { name: 'Mute' }))
    expect(onAction).toHaveBeenLastCalledWith('unmute:bass')
  })

  it('accepts per-layer options', () => {
    render(<Studio {...base()} options={{ drums: ['TR-808'], chords: ['electric_piano_1'], bass: ['electric_bass_finger'], melody: ['marimba'] }} />)
    expect(screen.getByLabelText('Drum kit').querySelectorAll('option')).toHaveLength(1)
  })
})
