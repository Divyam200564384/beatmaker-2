import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PlayBar from './PlayBar.jsx'
import { createDefaultSong } from '../song/model.js'

vi.mock('../audio/render.js', () => ({ renderSongWav: vi.fn() }))
import { renderSongWav } from '../audio/render.js'

const setup = (props = {}) => {
  const p = {
    song: createDefaultSong(), commit: vi.fn(), preview: vi.fn(), playing: false,
    onToggle: vi.fn(), onUndo: vi.fn(), onRedo: vi.fn(), canUndo: true, canRedo: false,
    onMenu: vi.fn(), statusText: '', tools: null, ...props,
  }
  render(<PlayBar {...p} />)
  return p
}

beforeEach(() => vi.clearAllMocks())

describe('PlayBar', () => {
  it('Play toggles and shows Stop when playing', () => {
    const p = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(p.onToggle).toHaveBeenCalled()
  })
  it('shows Stop when playing', () => {
    setup({ playing: true })
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
  })
  it('disables Undo/Redo when unavailable', () => {
    setup({ canUndo: false })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })
  it('tools set hides key, share and wav', () => {
    setup({ tools: new Set(['tempo']) })
    expect(screen.queryByLabelText('Key')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save WAV' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    expect(screen.getByLabelText('Tempo')).toBeInTheDocument()
  })
  it('tempo input previews, change commits', () => {
    const p = setup()
    fireEvent.input(screen.getByLabelText('Tempo'), { target: { value: '100' } })
    expect(p.preview).toHaveBeenCalled()
    expect(p.commit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Tempo'))
    expect(p.commit).toHaveBeenCalledTimes(1)
  })
  it('share copies the link', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByText('Link copied!')).toBeInTheDocument()
  })
  it('clipboard rejection shows the fallback input', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) } })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    const input = await screen.findByLabelText('Song link')
    expect(input).toHaveAttribute('readonly')
    expect(input.value).toBe(location.href)
  })
  it('Save WAV downloads and revokes', async () => {
    renderSongWav.mockResolvedValue(new Blob(['x']))
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Save WAV' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x'), { timeout: 2000 })
    expect(screen.getByRole('button', { name: 'Save WAV' })).not.toBeDisabled()
  })
  it('Save WAV is disabled while rendering', async () => {
    let resolve
    renderSongWav.mockReturnValue(new Promise((r) => { resolve = r }))
    URL.createObjectURL = vi.fn(() => 'blob:y')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Save WAV' }))
    expect(screen.getByRole('button', { name: 'Save WAV' })).toBeDisabled()
    await act(async () => { resolve(new Blob(['y'])) })
    expect(screen.getByRole('button', { name: 'Save WAV' })).not.toBeDisabled()
  })
  it('Save WAV failure shows message', async () => {
    renderSongWav.mockRejectedValue(new Error('x'))
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Save WAV' }))
    expect(await screen.findByText('Couldn\'t make the WAV. Try again')).toBeInTheDocument()
  })
})

describe('PlayBar status message', () => {
  it('clears the local message after a few seconds so statusText shows', async () => {
    vi.useFakeTimers()
    try {
      Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } })
      setup({ statusText: 'Loading… 40%' })
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share' })) })
      expect(screen.getByText('Link copied!')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(3100) })
      expect(screen.getByText('Loading… 40%')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
