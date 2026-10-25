import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const engine = { start: vi.fn().mockResolvedValue(), stop: vi.fn(), setSong: vi.fn(), preview: vi.fn() }
vi.mock('../audio/engine.js', () => ({ createEngine: vi.fn(() => engine) }))
import { createEngine } from '../audio/engine.js'
import { useEngine } from './useEngine.js'
import { createDefaultSong, setTempo } from '../song/model.js'

beforeEach(() => vi.clearAllMocks())

describe('useEngine', () => {
  it('does not create the engine on mount', () => {
    renderHook(() => useEngine(createDefaultSong()))
    expect(createEngine).not.toHaveBeenCalled()
  })

  it('toggle starts then stops, and song changes reach the engine', async () => {
    const song = createDefaultSong()
    const { result, rerender } = renderHook(({ s }) => useEngine(s), { initialProps: { s: song } })
    await act(async () => { await result.current.toggle() })
    expect(engine.start).toHaveBeenCalledWith(song)
    expect(result.current.playing).toBe(true)
    const next = setTempo(song, 90)
    rerender({ s: next })
    expect(engine.setSong).toHaveBeenLastCalledWith(next)
    await act(async () => { await result.current.toggle() })
    expect(engine.stop).toHaveBeenCalled()
    expect(result.current.playing).toBe(false)
  })
})

describe('useEngine source and stop', () => {
  it('a source overrides the song until setSource(null) restores it', async () => {
    const song = createDefaultSong()
    const lesson = setTempo(song, 80)
    const { result, rerender } = renderHook(({ s }) => useEngine(s), { initialProps: { s: song } })
    act(() => { result.current.setSource(lesson) })
    await act(async () => { await result.current.toggle() })
    expect(engine.start).toHaveBeenCalledWith(lesson)
    const next = setTempo(song, 120)
    engine.setSong.mockClear()
    rerender({ s: next })
    expect(engine.setSong).not.toHaveBeenCalled()
    act(() => { result.current.setSource(null) })
    expect(engine.setSong).toHaveBeenLastCalledWith(next)
  })

  it('stop() stops the engine and resets playing and step', async () => {
    const { result } = renderHook(() => useEngine(createDefaultSong()))
    await act(async () => { await result.current.toggle() })
    act(() => { createEngine.mock.calls[0][0].onStep(5) })
    expect(result.current.step).toBe(5)
    act(() => { result.current.stop() })
    expect(engine.stop).toHaveBeenCalled()
    expect(result.current.playing).toBe(false)
    expect(result.current.step).toBe(-1)
  })
})

describe('useEngine retry', () => {
  it('retry forwards the layer to the engine', () => {
    engine.retry = vi.fn()
    const { result } = renderHook(() => useEngine(createDefaultSong()))
    act(() => { result.current.retry('bass') })
    expect(engine.retry).toHaveBeenCalledWith('bass')
  })
})
