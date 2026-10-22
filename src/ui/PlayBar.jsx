/* eslint-disable react/prop-types -- internal component; props documented in the task brief */
import { useState } from 'react'
import { Play, Square, Undo2, Redo2, Share2, Download, Menu } from 'lucide-react'
import { NOTE_NAMES } from '../music/theory.js'
import { renderSongWav } from '../audio/render.js'
import './PlayBar.css'

export default function PlayBar({
  song, commit, preview, playing, onToggle, onUndo, onRedo, canUndo, canRedo,
  onShare, onWav, onMenu, statusText = '', tools = null,
}) {
  const [msg, setMsg] = useState('')
  const [fallbackUrl, setFallbackUrl] = useState(null)
  const show = (id) => tools === null || tools.has(id)

  async function share() {
    setFallbackUrl(null)
    try {
      await navigator.clipboard.writeText(location.href)
      setMsg('Link copied!')
    } catch {
      setMsg('')
      setFallbackUrl(location.href)
    }
    onShare?.()
  }

  async function wav() {
    setMsg('Rendering…')
    try {
      const blob = await renderSongWav(song)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'beatmaker-2.wav'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg('')
    } catch {
      setMsg("Couldn't make the WAV. Try again")
    }
    onWav?.()
  }

  return (
    <header className="playbar">
      <h1 className="playbar-title">Beatmaker 2</h1>
      <button type="button" className="playbar-play" aria-label={playing ? 'Stop' : 'Play'} onClick={onToggle}>
        {playing ? <Square aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      {show('tempo') && (
        <label className="playbar-field">
          <span>Tempo</span>
          <input
            type="range" min="70" max="140" value={song.tempo} aria-label="Tempo"
            onInput={(e) => preview((s) => ({ ...s, tempo: Number(e.target.value) }))}
            onChange={(e) => commit((s) => ({ ...s, tempo: Number(e.target.value) }))}
          />
          <output>{song.tempo}</output>
        </label>
      )}
      {show('key') && (
        <label className="playbar-field">
          <span>Key</span>
          <select aria-label="Key" value={song.key} onChange={(e) => commit((s) => ({ ...s, key: Number(e.target.value) }))}>
            {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
      )}
      {show('undo') && (
        <>
          <button type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}><Undo2 aria-hidden="true" /></button>
          <button type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}><Redo2 aria-hidden="true" /></button>
        </>
      )}
      {show('share') && (
        <button type="button" aria-label="Share" onClick={share}><Share2 aria-hidden="true" /></button>
      )}
      {show('wav') && (
        <button type="button" aria-label="Save WAV" onClick={wav}><Download aria-hidden="true" /></button>
      )}
      <button type="button" aria-label="Menu" onClick={onMenu}><Menu aria-hidden="true" /></button>
      {fallbackUrl && (
        <input
          className="playbar-link" readOnly aria-label="Song link" value={fallbackUrl}
          onFocus={(e) => e.target.select()}
        />
      )}
      <span className="playbar-status" role="status" aria-live="polite">{msg || statusText}</span>
    </header>
  )
}
