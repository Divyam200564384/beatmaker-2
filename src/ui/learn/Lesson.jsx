/* eslint-disable react/prop-types -- learn screen; props documented in the Task 13 brief */
import { useState, useEffect, useMemo, useCallback } from 'react'
import Studio from '../Studio.jsx'
import Coach from './Coach.jsx'
import Goals from './Goals.jsx'
import { useSong } from '../../hooks/useSong.js'
import { applyPatch, createEmptySong } from '../../song/model.js'
import { encodeSong } from '../../song/codec.js'
import { allowedItems, starsFor, CHORD_INSTRUMENTS } from '../../learn/progress.js'
import { KITS, INSTRUMENTS } from '../../audio/catalog.js'
import { WORLDS } from '../../learn/levels.js'
import './Learn.css'

const union = (a, b) => [...new Set([...a, ...b])]

// Picker options: what progress allows, plus whatever this level itself unlocks.
function lessonOptions(progress, unlocks) {
  const a = allowedItems(progress)
  let kits = a.kits
  let chords = a.chordInstruments
  let inst = a.instruments
  for (const u of unlocks) {
    if (u === 'kits:3') kits = union(kits, KITS.slice(0, 3).map((k) => k.id))
    else if (u === 'kits:all') kits = KITS.map((k) => k.id)
    else if (u === 'chord-instruments:5') chords = union(chords, CHORD_INSTRUMENTS)
    else if (u === 'instruments:all') inst = INSTRUMENTS.map((i) => i.id)
  }
  return { drums: kits, chords, bass: inst, melody: inst }
}

const QUIZ_LETTERS = 'ABCD'

export default function Lesson({ level, progress, onDone, onExit, engine }) {
  const [startSong] = useState(() => applyPatch(createEmptySong(), level.startPatch))
  const { song, commit: rawCommit, preview: rawPreview, undo, redo, canUndo, canRedo } = useSong({ initial: startSong, persist: false })
  const [actions, setActions] = useState([])
  const [revealed, setRevealed] = useState([])
  const [usedHint, setUsedHint] = useState(false)
  const [comparing, setComparing] = useState(null)
  const [quizMsg, setQuizMsg] = useState('')
  const [completed, setCompleted] = useState(false)
  const [bonusSeen, setBonusSeen] = useState(false)

  const tools = useMemo(() => new Set(level.tools), [level])
  const options = useMemo(() => lessonOptions(progress, level.unlocks), [progress, level])
  const compareSongs = useMemo(() => (level.compare ?? []).map((c) => applyPatch(startSong, c.patch)), [level, startSong])
  const onAction = useCallback((name) => setActions((a) => [...a, name]), [])

  // Goals are checked on every song or action change.
  const ctx = { song, actions }
  const met = level.goals.map((g) => g.check(ctx))
  const allMet = met.every(Boolean)
  const bonusNow = level.bonus ? (level.bonus.self ? actions.includes('self-check') : level.bonus.check(ctx)) : false

  // Once reached, completion and the bonus stay earned even if the song changes afterwards.
  useEffect(() => { if (allMet) setCompleted(true) }, [allMet])
  useEffect(() => { if (bonusNow) setBonusSeen(true) }, [bonusNow])
  const done = completed || allMet
  const bonusMet = bonusSeen || bonusNow
  const stars = starsFor({ goalsMet: done, usedHint, bonusMet })

  // The shared engine plays the lesson song, or the compare song being listened to.
  const { setSource, stop } = engine
  const playingSong = comparing != null ? compareSongs[comparing] : song
  useEffect(() => { setSource?.(playingSong) }, [setSource, playingSong])
  useEffect(() => () => {
    stop?.()
    setSource?.(null)
  }, [setSource, stop])

  // Any edit leaves compare mode so the user hears their own song again.
  const commit = useCallback((fn) => { setComparing(null); rawCommit(fn) }, [rawCommit])
  const preview = useCallback((fn) => { setComparing(null); rawPreview(fn) }, [rawPreview])

  const onCompare = (i) => {
    if (comparing === i) {
      setComparing(null)
      setSource?.(song)
      if (engine.playing) engine.toggle()
      return
    }
    setComparing(i)
    setSource?.(compareSongs[i])
    if (!engine.playing) engine.toggle()
  }

  const studioEngine = {
    ...engine,
    toggle: () => {
      if (comparing != null) {
        setComparing(null)
        setSource?.(song)
      }
      engine.toggle()
    },
  }

  const onHint = () => {
    const i = met.findIndex((m) => !m)
    if (i < 0) return
    setUsedHint(true)
    setRevealed((r) => (r.includes(i) ? r : [...r, i]))
  }

  const onQuiz = (i) => {
    if (i === level.quiz.answer) {
      setQuizMsg('Yes! That one sounds sad.')
      onAction('quiz:correct')
    } else {
      setQuizMsg('Listen again. That one sounds happy.')
    }
  }

  let ringHint = null
  if (level.id === 2) ringHint = !met[0] ? { ring: 'snare', step: 4 } : !met[1] ? { ring: 'snare', step: 12 } : null

  const metCount = met.filter(Boolean).length
  const shareUrl = `${location.origin}${location.pathname}#${encodeSong(song)}`

  return (
    <div className="lesson">
      <div className="lesson-top">
        <button type="button" className="learn-btn lesson-exit" aria-label="Exit lesson" onClick={onExit}>✕</button>
        <h2 className="lesson-title" title={WORLDS[level.world - 1]}>World {level.world} · Level {level.id} · {level.title}</h2>
        <div
          className="lesson-progress" role="progressbar" aria-label="Goals met"
          aria-valuemin={0} aria-valuemax={level.goals.length} aria-valuenow={metCount}
        >
          <span style={{ width: `${(metCount / level.goals.length) * 100}%` }} />
        </div>
      </div>

      <Coach lines={level.coach} />

      {compareSongs.length > 0 && (
        <div className="lesson-compare" role="group" aria-label="Listen and compare">
          {level.compare.map((c, i) => (
            <button
              key={c.label} type="button" className="learn-btn" aria-pressed={comparing === i}
              onClick={() => onCompare(i)}
            ><span aria-hidden="true">🔊 </span>{c.label}</button>
          ))}
        </div>
      )}

      {level.quiz && (
        <div className="lesson-quiz">
          <div role="group" aria-label="Which is sad?" className="lesson-compare">
            {level.compare.map((c, i) => (
              <button key={c.label} type="button" className="learn-btn" onClick={() => onQuiz(i)}>{QUIZ_LETTERS[i]}</button>
            ))}
          </div>
          <p role="status">{quizMsg}</p>
        </div>
      )}

      <Studio
        song={song} commit={commit} preview={preview} engine={studioEngine}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
        tools={tools} options={options} onAction={onAction} ringHint={ringHint}
        shareUrl={shareUrl} onMenu={null}
      />

      <Goals
        goals={level.goals} met={met} revealed={revealed} bonus={level.bonus} bonusMet={bonusMet}
        selfChecked={actions.includes('self-check')} onHint={onHint} onSelfCheck={() => onAction('self-check')}
      />

      {done && (
        <section className="lesson-done" role="region" aria-label="Level complete">
          <h2>🎉 Level complete!</h2>
          <p className="lesson-stars" aria-label={`${stars} ${stars === 1 ? 'star' : 'stars'}`}>{'⭐'.repeat(stars)}</p>
          <button type="button" className="home-btn" onClick={() => onDone(stars)}>
            {level.id === 15 ? 'Finish ▶' : 'Next level ▶'}
          </button>
        </section>
      )}
    </div>
  )
}
