import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const eng = { playing: false, toggle: vi.fn(), step: -1, status: {}, preview: vi.fn(), retry: vi.fn() }
vi.mock('./hooks/useEngine.js', () => ({ useEngine: () => eng }))
import App from './App.jsx'

const setUA = (ua, touch = 0) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
  Object.defineProperty(navigator, 'maxTouchPoints', { value: touch, configurable: true })
}
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
const MSG = 'No sound? Check your silent switch.'

beforeEach(() => {
  localStorage.clear()
  eng.playing = false
  history.replaceState(null, '', '#' + 'x')
})
afterEach(() => vi.restoreAllMocks())

function openStudio(ui) {
  history.replaceState(null, '', '/')
  const r = ui()
  fireEvent.click(screen.getByRole('button', { name: 'Open studio' }))
  return r
}

describe('hints', () => {
  it('shows the silent-switch hint once on iPhone after Play and records it', () => {
    setUA(IPHONE)
    const { rerender } = openStudio(() => render(<App />))
    expect(screen.queryByText(MSG)).toBeNull()
    eng.playing = true
    rerender(<App />)
    expect(screen.getByText(MSG)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('bm2.hints')).silentSwitch).toBe(true)
  })

  it('detects an iPad posing as a Mac', () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)
    const { rerender } = openStudio(() => render(<App />))
    eng.playing = true
    rerender(<App />)
    expect(screen.getByText(MSG)).toBeInTheDocument()
  })

  it('does not show it on desktop or when already seen', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0)')
    const { rerender } = openStudio(() => render(<App />))
    eng.playing = true
    rerender(<App />)
    expect(screen.queryByText(MSG)).toBeNull()
    vi.restoreAllMocks()
    setUA(IPHONE)
    localStorage.setItem('bm2.hints', JSON.stringify({ silentSwitch: true }))
    eng.playing = false
    const r2 = render(<App />)
    eng.playing = true
    r2.rerender(<App />)
    expect(screen.queryByText(MSG)).toBeNull()
  })

  it('shows the hint only once per session even when storage is unavailable', () => {
    setUA(IPHONE)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    const { rerender } = openStudio(() => render(<App />))
    expect(screen.getByText("Progress can't be saved in this browser.")).toBeInTheDocument()
    eng.playing = true
    rerender(<App />)
    eng.playing = false
    rerender(<App />)
    eng.playing = true
    rerender(<App />)
    expect(screen.getAllByText(MSG)).toHaveLength(1)
  })
})
