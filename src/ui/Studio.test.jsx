import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import Studio from './Studio.jsx'
import { createDefaultSong, setTempo } from '../song/model.js'
import { encodeSong } from '../song/codec.js'

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

  it('moves between tabs with the arrow keys, Home and End', () => {
    window.innerWidth = 375
    render(<Studio {...base()} />)
    const tab = (n) => screen.getByRole('tab', { name: n })
    expect(tab('Drums')).toHaveAttribute('tabindex', '0')
    expect(tab('Chords')).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(tab('Drums'), { key: 'ArrowRight' })
    expect(tab('Chords')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Chords')).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Chords' })).toBeInTheDocument()
    fireEvent.keyDown(tab('Chords'), { key: 'ArrowLeft' })
    fireEvent.keyDown(tab('Drums'), { key: 'ArrowLeft' })
    expect(tab('Melody')).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(tab('Melody'), { key: 'Home' })
    expect(tab('Drums')).toHaveFocus()
    fireEvent.keyDown(tab('Drums'), { key: 'End' })
    expect(tab('Melody')).toHaveFocus()
  })

  it('reacts to a resize', () => {
    render(<Studio {...base()} />)
    setWidth(375)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('hides layers whose tools are all filtered out', () => {
    window.innerWidth = 375
    render(<Studio {...base()} tools={new Set(['kick', 'melody'])} />)
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.queryByRole('tab', { name: /Chords/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Bass/ })).toBeNull()
  })

  it('drops the tab bar on a phone when only one layer is left', () => {
    window.innerWidth = 375
    render(<Studio {...base()} tools={new Set(['kick'])} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('tabpanel')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Drums' })).toBeInTheDocument()
  })

  it('Retry calls the engine retry for that layer', () => {
    const retry = vi.fn()
    const eng = { ...engine, retry, status: { bass: { layer: 'bass', state: 'error', message: 'x', id: 'electric_bass_finger' } } }
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

  it('says when every loaded instrument is ready, after any load error', () => {
    const ready = (layer) => ({ layer, state: 'ready' })
    const status = { drums: ready('drums'), chords: ready('chords'), bass: ready('bass'), melody: ready('melody') }
    const { rerender } = render(<Studio {...base()} engine={{ ...engine, status }} />)
    expect(screen.getAllByRole('status').some((e) => e.textContent === 'All instruments ready')).toBe(true)
    rerender(<Studio {...base()} engine={{ ...engine, status }} statusText="Bad link" />)
    expect(screen.getByText('Bad link')).toBeInTheDocument()
    expect(screen.queryByText('All instruments ready')).toBeNull()
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

describe('Studio ring samples and load errors', () => {
  it('passes the engine ring samples to the rings, naming a closest sound', () => {
    const ringSamples = {
      kick: { name: 'kick', exact: true }, snare: { name: 'clap', exact: false },
      hat: { name: 'hihat-close', exact: true }, perc: { name: 'hihat-open', exact: true },
    }
    render(<Studio {...base()} engine={{ ...engine, ringSamples }} />)
    expect(screen.getByText('clap (closest sound)')).toBeInTheDocument()
    expect(screen.getByText('hihat-close')).toBeInTheDocument()
  })

  it('names the failed instrument by its label in the panel and the play bar', () => {
    const eng = { ...engine, retry: vi.fn(), status: { chords: { layer: 'chords', state: 'error', message: 'HTTP 404', id: 'electric_piano_1' } } }
    render(<Studio {...base()} engine={eng} />)
    const chords = screen.getByRole('heading', { name: 'Chords' }).closest('header')
    expect(within(chords).getByRole('alert')).toHaveTextContent("Couldn't load Electric piano 1. Retry")
    expect(screen.queryByText(/HTTP 404/)).toBeNull()
    expect(screen.getAllByRole('status').some((e) => e.textContent === "Couldn't load Electric piano 1.")).toBe(true)
  })

  it('names a failed kit by its label', () => {
    const eng = { ...engine, retry: vi.fn(), status: { drums: { layer: 'drums', state: 'error', message: 'x', id: 'LM-2' } } }
    render(<Studio {...base()} engine={eng} />)
    expect(screen.getAllByText(/Couldn't load LinnDrum LM-2[.]/).length).toBeGreaterThan(0)
  })
})

describe('Studio share link', () => {
  it('Share copies a link for the current song even before the debounced hash write', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.assign(navigator, { clipboard: { writeText } })
    history.replaceState(null, '', '/app/#stale')
    const song = setTempo(createDefaultSong(), 133)
    render(<Studio {...base()} song={song} />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/app/#${encodeSong(song)}`)
  })
})

