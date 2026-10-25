import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSong } from './useSong.js'
import { createDefaultSong, setTempo, setKey } from '../song/model.js'
import { encodeSong } from '../song/codec.js'

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '#')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSong', () => {
  it('falls back to default with a message on a bad hash', () => {
    history.replaceState(null, '', '#!!!notasong')
    const { result } = renderHook(() => useSong())
    expect(result.current.song).toEqual(createDefaultSong())
    expect(result.current.loadError).toBe("Couldn't read that song link, started a new one")
  })

  it('decodes a valid hash', () => {
    const s = setTempo(createDefaultSong(), 90)
    history.replaceState(null, '', '#' + encodeSong(s))
    const { result } = renderHook(() => useSong())
    expect(result.current.song.tempo).toBe(90)
    expect(result.current.loadError).toBe(null)
  })

  it('uses bm2.song from storage when there is no hash', () => {
    localStorage.setItem('bm2.song', JSON.stringify(encodeSong(setTempo(createDefaultSong(), 100))))
    const { result } = renderHook(() => useSong())
    expect(result.current.song.tempo).toBe(100)
  })

  it('commit then undo restores, redo reapplies', () => {
    const { result } = renderHook(() => useSong())
    const before = result.current.song.tempo
    act(() => result.current.commit((s) => setTempo(s, 100)))
    expect(result.current.song.tempo).toBe(100)
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.song.tempo).toBe(before)
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.redo())
    expect(result.current.song.tempo).toBe(100)
  })

  it('ten previews then one commit is a single undo step', () => {
    const { result } = renderHook(() => useSong())
    const before = result.current.song.tempo
    for (let t = 71; t <= 80; t++) act(() => result.current.preview((s) => setTempo(s, t)))
    expect(result.current.song.tempo).toBe(80)
    act(() => result.current.commit((s) => setTempo(s, 80)))
    act(() => result.current.undo())
    expect(result.current.song.tempo).toBe(before)
    expect(result.current.canUndo).toBe(false)
  })

  it('writes the hash and storage on change, after a short pause', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSong())
    act(() => result.current.commit((s) => setKey(s, 5)))
    act(() => vi.advanceTimersByTime(300))
    const enc = encodeSong(result.current.song)
    expect(location.hash).toBe('#' + enc)
    expect(JSON.parse(localStorage.getItem('bm2.song'))).toBe(enc)
  })

  it('persist:false uses initial and never writes', () => {
    history.replaceState(null, '', '#' + encodeSong(setTempo(createDefaultSong(), 90)))
    localStorage.setItem('bm2.song', JSON.stringify(encodeSong(setTempo(createDefaultSong(), 100))))
    const hashBefore = location.hash
    const initial = setTempo(createDefaultSong(), 120)
    const { result } = renderHook(() => useSong({ initial, persist: false }))
    expect(result.current.song.tempo).toBe(120)
    act(() => result.current.commit((s) => setKey(s, 5)))
    expect(location.hash).toBe(hashBefore)
    expect(JSON.parse(localStorage.getItem('bm2.song'))).toBe(encodeSong(setTempo(createDefaultSong(), 100)))
  })

  it('many rapid previews write the hash only a bounded number of times', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(history, 'replaceState')
    const { result } = renderHook(() => useSong())
    for (let t = 60; t <= 160; t++) {
      act(() => result.current.preview((s) => setTempo(s, t)))
      act(() => vi.advanceTimersByTime(20))
    }
    act(() => result.current.commit((s) => setTempo(s, 160)))
    act(() => vi.advanceTimersByTime(1000))
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2)
    expect(location.hash).toBe('#' + encodeSong(result.current.song))
  })

  it('a throwing replaceState does not crash the hook', () => {
    vi.useFakeTimers()
    vi.spyOn(history, 'replaceState').mockImplementation(() => {
      throw new DOMException('Attempt to use history.replaceState() more than 100 times', 'SecurityError')
    })
    const { result } = renderHook(() => useSong())
    act(() => result.current.commit((s) => setTempo(s, 100)))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.song.tempo).toBe(100)
  })

  it('writes a pending song on unmount and on pagehide', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useSong())
    act(() => result.current.commit((s) => setTempo(s, 101)))
    window.dispatchEvent(new Event('pagehide'))
    expect(location.hash).toBe('#' + encodeSong(result.current.song))
    act(() => result.current.commit((s) => setTempo(s, 102)))
    const enc = encodeSong(result.current.song)
    unmount()
    expect(location.hash).toBe('#' + enc)
  })

  it('reports previewing while a drag is not committed', () => {
    const { result } = renderHook(() => useSong())
    expect(result.current.previewing).toBe(false)
    act(() => result.current.preview((s) => setTempo(s, 100)))
    expect(result.current.previewing).toBe(true)
    act(() => result.current.commit((s) => setTempo(s, 100)))
    expect(result.current.previewing).toBe(false)
  })

  it('a share link keeps the autosaved song one Undo away', () => {
    const mine = setTempo(createDefaultSong(), 100)
    localStorage.setItem('bm2.song', JSON.stringify(encodeSong(mine)))
    history.replaceState(null, '', '#' + encodeSong(setTempo(createDefaultSong(), 90)))
    const { result } = renderHook(() => useSong())
    expect(result.current.song.tempo).toBe(90)
    expect(result.current.notice).toBe('Your previous song is one Undo away.')
    expect(result.current.openedLink).toBe(true)
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.song).toEqual(mine)
  })

  it('a hash equal to the autosave is not treated as a new link', () => {
    const enc = encodeSong(setTempo(createDefaultSong(), 100))
    localStorage.setItem('bm2.song', JSON.stringify(enc))
    history.replaceState(null, '', '#' + enc)
    const { result } = renderHook(() => useSong())
    expect(result.current.notice).toBe(null)
    expect(result.current.openedLink).toBe(false)
    expect(result.current.canUndo).toBe(false)
  })

  it('a link with no autosave opens without a notice', () => {
    history.replaceState(null, '', '#' + encodeSong(setTempo(createDefaultSong(), 90)))
    const { result } = renderHook(() => useSong())
    expect(result.current.notice).toBe(null)
    expect(result.current.openedLink).toBe(true)
    expect(result.current.canUndo).toBe(false)
  })
})
