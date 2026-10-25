import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App.jsx'
import Credits from './ui/Credits.jsx'
import { encodeSong } from './song/codec.js'
import { createDefaultSong } from './song/model.js'

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

describe('Credits', () => {
  it('lists licences with links', () => {
    render(<Credits onBack={() => {}} />)
    expect(screen.getByText(/MusyngKite/)).toBeInTheDocument()
    expect(screen.getByText(/FluidR3_GM/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Beatmaker v1/ })).toHaveAttribute('href', 'https://divyam200564384.github.io/beatmaker/')
    expect(screen.getByRole('link', { name: 'CC BY-SA 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/3.0/')
    expect(screen.getByRole('link', { name: 'CC BY 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/')
  })
})
