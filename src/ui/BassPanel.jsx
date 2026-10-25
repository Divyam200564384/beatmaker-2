/* eslint-disable react/prop-types -- bass editor; props documented in the Task 10 brief */
import { setBassStyle } from '../song/model.js'
import './LayerPanels.css'

const STYLES = [['kick', 'Lock to kick'], ['long', 'Long'], ['bounce', 'Bounce'], ['walking', 'Walking'], ['off', 'Off']]

export default function BassPanel({ song, commit, onAction }) {
  return (
    <div className="lp">
      <div className="lp-seg" role="group" aria-label="Bass style">
        {STYLES.map(([id, label]) => (
          <button
            key={id} type="button" aria-pressed={song.bass.style === id}
            className={song.bass.style === id ? 'on' : ''}
            onClick={() => { commit((s) => setBassStyle(s, id)); onAction?.('bass-style') }}
          >{label}</button>
        ))}
      </div>
      <p className="lp-note">The bass plays the bottom note of your chords.</p>
    </div>
  )
}
