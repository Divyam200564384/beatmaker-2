import { useState, useEffect, useRef, useCallback } from 'react'
import Studio from './ui/Studio.jsx'
import Home from './ui/Home.jsx'
import Credits from './ui/Credits.jsx'
import Menu from './ui/Menu.jsx'
import LevelMap from './ui/learn/LevelMap.jsx'
import Lesson from './ui/learn/Lesson.jsx'
import { LEVELS } from './learn/levels.js'
import { loadProgress, saveProgress, completeLevel } from './learn/progress.js'
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
  const shown = useRef(false)
  const [hints, setHints] = useState(() => (storageWorks() ? [] : ["Progress can't be saved in this browser."]))
  useEffect(() => {
    if (!playing || shown.current || !isIos()) return
    shown.current = true
    const seen = safeGet('bm2.hints') ?? {}
    if (seen.silentSwitch) return
    safeSet('bm2.hints', { ...seen, silentSwitch: true })
    setHints((h) => [...h, 'No sound? Check your silent switch.'])
  }, [playing])
  return hints
}

export default function App() {
  const { song, commit, preview, undo, redo, canUndo, canRedo, loadError, notice, openedLink } = useSong()
  const engine = useEngine(song)
  const hints = useHints(engine.playing)
  // Only a song link (not the autosave echoed back into the URL on reload) skips Home.
  const [screen, setScreen] = useState(() => (openedLink ? 'studio' : 'home'))
  const [progress, setProgress] = useState(loadProgress)
  const [lessonId, setLessonId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const [showLoadError, setShowLoadError] = useState(true)
  useEffect(() => {
    if (engine.playing) { setShowLoadError(false); return }
    const t = setTimeout(() => setShowLoadError(false), 5000)
    return () => clearTimeout(t)
  }, [engine.playing])

  if (screen === 'credits') return <Credits onBack={() => setScreen('home')} />
  if (screen === 'learn-map') {
    return (
      <LevelMap
        progress={progress}
        onOpen={(id) => { setLessonId(id); setScreen('lesson') }}
        onBack={() => setScreen('home')}
      />
    )
  }
  if (screen === 'lesson') {
    const level = LEVELS.find((l) => l.id === lessonId)
    return (
      <Lesson
        key={level.id} level={level} progress={progress} engine={engine}
        onExit={() => setScreen('learn-map')}
        onDone={(stars) => {
          const next = completeLevel(progress, level.id, stars)
          saveProgress(next)
          setProgress(next)
          setScreen('learn-map')
        }}
      />
    )
  }
  if (screen === 'home') {
    return (
      <Home
        onLearn={() => setScreen('learn-map')}
        learnLabel={Object.keys(progress.stars).length ? `Continue · Level ${progress.current}` : 'Start'}
        graduate={(progress.stars[15] ?? 0) > 0}
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
        onMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen}
        statusText={showLoadError ? loadError || notice || '' : ''} hints={hints}
      />
      {menuOpen && (
        <Menu
          onClose={closeMenu}
          onHome={() => { if (engine.playing) engine.toggle(); setScreen('home') }}
          onCredits={() => { if (engine.playing) engine.toggle(); setScreen('credits') }}
          onResetProgress={() => { clearProgress(); setProgress(loadProgress()) }}
          onNewSong={() => commit(createDefaultSong)}
        />
      )}
    </>
  )
}
