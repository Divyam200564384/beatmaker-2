/* eslint-disable react/prop-types -- chord editor; props documented in the Task 10 brief */
import { useState } from 'react'
import { DEGREES, FEELINGS, NEXT, chordName, chordNotes } from '../music/theory.js'
import { setChord, setChordRhythm } from '../song/model.js'
import './LayerPanels.css'

const RHYTHMS = [['hold', 'Hold'], ['strum', 'Strum'], ['pulse', 'Pulse']]

export default function ChordPanel({ song, commit, onSound, step = null, tools = null }) {
  const has = (id) => !tools || tools.has(id)
  const [sel, setSel] = useState(0)
  const { prog, rhythm } = song.chords
  const key = song.key
  const curBar = step == null ? -1 : Math.floor(step / 16)
  const palette = DEGREES.filter((d) => has('maj7') || !d.endsWith('maj7'))
  const suggested = has('suggest') && prog[(sel + 3) % 4] ? NEXT[prog[(sel + 3) % 4]] : []

  const pick = (degree) => {
    const bar = sel
    commit((s) => setChord(s, bar, degree))
    if (degree) onSound?.('chords', chordNotes(degree, key))
    setSel((bar + 1) % 4)
  }

  return (
    <div className="lp">
      <div className="lp-bars" role="group" aria-label="Chord bars">
        {prog.map((d, i) => (
          <button
            key={i}
            type="button"
            className={`lp-bar${i === sel ? ' selected' : ''}${i === curBar ? ' playing' : ''}`}
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
          >
            <span className="lp-bar-n">bar {i + 1}</span>
            <b>{d ? chordName(d, key) : 'empty'}</b>
            <span className="lp-feel">{d ? FEELINGS[d] : ''}</span>
          </button>
        ))}
      </div>

      <div className="lp-palette" role="group" aria-label={`Chords for bar ${sel + 1}`}>
        {palette.map((d) => {
          const star = suggested.includes(d)
          return (
            <button key={d} type="button" className="lp-chord" aria-label={`${chordName(d, key)} ${FEELINGS[d]}`} title={star ? 'Suggested next chord' : undefined} onClick={() => pick(d)}>
              {`${chordName(d, key)} ${FEELINGS[d]}`}
              {star && <span aria-hidden="true" className="lp-star">★</span>}
            </button>
          )
        })}
        <button type="button" className="lp-chord" onClick={() => pick(null)}>No chord</button>
      </div>

      {has('rhythm') && (
        <div className="lp-seg" role="group" aria-label="Chord rhythm">
          {RHYTHMS.map(([id, label]) => (
            <button
              key={id} type="button" aria-pressed={rhythm === id}
              className={rhythm === id ? 'on' : ''}
              onClick={() => commit((s) => setChordRhythm(s, id))}
            >{label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
