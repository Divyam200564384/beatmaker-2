import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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
})
