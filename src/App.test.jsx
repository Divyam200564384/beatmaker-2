import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App.jsx'
import Credits from './ui/Credits.jsx'
import { encodeSong } from './song/codec.js'
import { createDefaultSong, setTempo } from './song/model.js'

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
})
afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('opens on home when there is no song hash', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open studio' })).toBeInTheDocument()
  })

  it('Open studio shows the four panels', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open studio' }))
    for (const t of ['Drums', 'Chords', 'Bass', 'Melody']) {
      expect(screen.getByRole('heading', { name: t })).toBeInTheDocument()
    }
  })

  it('a song hash opens the studio directly', () => {
    history.replaceState(null, '', '#' + encodeSong(createDefaultSong()))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Drums' })).toBeInTheDocument()
  })

  it('a reload whose hash is the autosaved song opens on home', () => {
    const enc = encodeSong(setTempo(createDefaultSong(), 100))
    localStorage.setItem('bm2.song', JSON.stringify(enc))
    history.replaceState(null, '', '#' + enc)
    render(<App />)
    expect(screen.getByRole('button', { name: 'Open studio' })).toBeInTheDocument()
  })

  it('a share link over a different autosave opens the studio and says Undo brings it back', () => {
    localStorage.setItem('bm2.song', JSON.stringify(encodeSong(setTempo(createDefaultSong(), 100))))
    history.replaceState(null, '', '#' + encodeSong(setTempo(createDefaultSong(), 90)))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Drums' })).toBeInTheDocument()
    expect(screen.getByText('Your previous song is one Undo away.')).toBeInTheDocument()
  })

  it('Credits link and Back work', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Credits' }))
    expect(screen.getByText(/CC BY-SA 3.0/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'Open studio' })).toBeInTheDocument()
  })

  it('menu: Reset and New song confirm first, Home goes home', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem('bm2.progress', '{}')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open studio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learn progress' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('bm2.progress')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'New song' }))
    expect(confirm).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(screen.getByRole('button', { name: 'Open studio' })).toBeInTheDocument()
  })

  it('menu focuses its first item, Escape closes and refocuses the Menu button', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open studio' }))
    const menuBtn = screen.getByRole('button', { name: 'Menu' })
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Home' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull()
    expect(menuBtn).toHaveFocus()
  })

  it('shows a bad-link message when there is no engine status', () => {
    history.replaceState(null, '', '#!!!notasong')
    render(<App />)
    expect(screen.getByText(/Couldn't read that song link/)).toBeInTheDocument()
  })

  it('declining the confirm keeps progress', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    localStorage.setItem('bm2.progress', '{}')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open studio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset Learn progress' }))
    expect(localStorage.getItem('bm2.progress')).toBe('{}')
  })
})

describe('App learn mode', () => {
  it('Learn opens the map, a finished lesson saves progress and returns to the map', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Level 1, current' }))
    expect(screen.getByText('World 1 · Level 1 · Heartbeat')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Kick hits'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next level ▶' }))
    expect(screen.getByRole('button', { name: 'Level 1, Heartbeat, 2 stars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Level 2, current' })).toBeEnabled()
    expect(JSON.parse(localStorage.getItem('bm2.progress'))).toEqual({ stars: { 1: 2 }, current: 2 })
    await waitFor(() => expect(localStorage.getItem('bm2.song')).not.toBeNull()) // free play song untouched by the lesson
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'Continue · Level 2' })).toBeInTheDocument()
  })

  it('home shows the Graduate badge once level 15 has stars', () => {
    localStorage.setItem('bm2.progress', JSON.stringify({ stars: { 15: 2 }, current: 15 }))
    render(<App />)
    expect(screen.getByText('🎓 Graduate')).toBeInTheDocument()
  })

  it('home has no Graduate badge before level 15', () => {
    localStorage.setItem('bm2.progress', JSON.stringify({ stars: { 14: 2 }, current: 15 }))
    render(<App />)
    expect(screen.queryByText('🎓 Graduate')).toBeNull()
  })

  it('exiting a lesson returns to the map', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Level 1, current' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit lesson' }))
    expect(screen.getByRole('button', { name: 'Level 1, current' })).toBeInTheDocument()
  })
})

describe('Credits', () => {
  it('lists licences with links', () => {
    render(<Credits onBack={() => {}} />)
    expect(screen.getByText(/MusyngKite/)).toBeInTheDocument()
    expect(screen.getByText(/FluidR3_GM/)).toBeInTheDocument()
    expect(screen.getByText(/FluidR3_GM soundfont by Frank Wen/)).toBeInTheDocument()
    expect(screen.getByText(/MusyngKite soundfont, via gleitz\/midi-js-soundfonts/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Beatmaker v1/ })).toHaveAttribute('href', 'https://divyam200564384.github.io/beatmaker/')
    expect(screen.getByRole('link', { name: 'CC BY-SA 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/3.0/')
    expect(screen.getByRole('link', { name: 'CC BY 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/')
  })
})
