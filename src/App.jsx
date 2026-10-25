import { useState, useEffect } from 'react'
import Studio from './ui/Studio.jsx'
import Home from './ui/Home.jsx'
import Credits from './ui/Credits.jsx'
import Menu from './ui/Menu.jsx'
import './ui/Home.css'
import { useSong } from './hooks/useSong.js'
import { useEngine } from './hooks/useEngine.js'
import { createDefaultSong } from './song/model.js'
import { safeGet, safeSet } from './storage.js'

function clearProgress() {
  try {
    localStorage.removeItem('bm2.progress')
  } catch {
    // storage unavailable: nothing to clear
  }
}

function isIos() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function storageWorks() {
  if (!safeSet('bm2.probe', 1)) return false
  try {
    localStorage.removeItem('bm2.probe')
  } catch {
    // ignore
  }
  return true
}

function useHints(playing) {
  const [hints, setHints] = useState(() => (storageWorks() ? [] : ["Progress can't be saved in this browser."]))
  useEffect(() => {
    if (!playing || !isIos()) return
    const seen = safeGet('bm2.hints') ?? {}
    if (seen.silentSwitch) return
    safeSet('bm2.hints', { ...seen, silentSwitch: true })
    setHints((h) => [...h, 'No sound? Check your silent switch.'])
  }, [playing])
  return hints
}

export default function App() {
  const { song, commit, preview, undo, redo, canUndo, canRedo, loadError } = useSong()
  const engine = useEngine(song)
  const hints = useHints(engine.playing)
  const [screen, setScreen] = useState(() => (location.hash.length > 1 ? 'studio' : 'home'))
  const [menuOpen, setMenuOpen] = useState(false)

  if (screen === 'credits') return <Credits onBack={() => setScreen('home')} />
  if (screen === 'learn-map') {
    return (
      <div className="home">
        <h1>Learn</h1>
        <p>Lessons are coming soon.</p>
        <button type="button" className="home-link" onClick={() => setScreen('home')}>Back</button>
      </div>
    )
  }
  if (screen === 'home') {
    return (
      <Home
        onLearn={() => setScreen('learn-map')}
        onStudio={() => setScreen('studio')}
        onCredits={() => setScreen('credits')}
      />
    )
  }
  return (
    <>
      <Studio
        song={song} commit={commit} preview={preview} engine={engine}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
        onMenu={() => setMenuOpen((o) => !o)} statusText={loadError || ''} hints={hints}
      />
      {menuOpen && (
        <Menu
          onClose={() => setMenuOpen(false)}
          onHome={() => { if (engine.playing) engine.toggle(); setScreen('home') }}
          onCredits={() => { if (engine.playing) engine.toggle(); setScreen('credits') }}
          onResetProgress={clearProgress}
          onNewSong={() => commit(createDefaultSong)}
        />
      )}
    </>
  )
}
