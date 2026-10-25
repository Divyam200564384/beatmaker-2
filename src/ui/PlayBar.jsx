/* eslint-disable react/prop-types -- internal component; props documented in the task brief */
import { useState, useEffect, useRef } from 'react'
import { Play, Square, Undo2, Redo2, Share2, Download, Menu } from 'lucide-react'
import { NOTE_NAMES } from '../music/theory.js'
import { setTempo, setKey } from '../song/model.js'
import RangeSlider from './RangeSlider.jsx'
import { renderSongWav } from '../audio/render.js'
import './PlayBar.css'

export default function PlayBar({
  song, commit, preview, playing, onToggle, onUndo, onRedo, canUndo, canRedo,
  onShare, onWav, onMenu, menuOpen = false, statusText = '', tools = null, shareUrl,
}) {
  const [msg, setMsg] = useState('')
  const [fallbackUrl, setFallbackUrl] = useState(null)
  const [rendering, setRendering] = useState(false)
  const timers = useRef(new Set())
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.current.delete(t); fn() }, ms)
    timers.current.add(t)
  }
  useEffect(() => {
    const all = timers.current
    return () => all.forEach(clearTimeout)
  }, [])
  const flash = (text) => {
    setMsg(text)
    if (text) later(() => setMsg((m) => (m === text ? '' : m)), 3000)
  }
  const show = (id) => tools === null || tools.has(id)

  async function share() {
    setFallbackUrl(null)
    try {
      await navigator.clipboard.writeText(shareUrl ?? location.href)
      flash('Link copied!')
    } catch {
      setMsg('')
      setFallbackUrl(shareUrl ?? location.href)
    }
    onShare?.()
  }

  async function wav() {
    setMsg('Rendering…')
    setRendering(true)
    try {
      const blob = await renderSongWav(song)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'beatmaker-2.wav'
      document.body.appendChild(a)
      a.click()
      a.remove()
      later(() => URL.revokeObjectURL(url), 1000)
      setMsg('')
      onWav?.()
    } catch {
      flash("Couldn't make the WAV. Try again")
    } finally {
      setRendering(false)
    }
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
          <RangeSlider
            label="Tempo" min={70} max={140} value={song.tempo}
            onPreview={(v) => preview((x) => setTempo(x, v))}
            onCommit={(v) => commit((x) => setTempo(x, v))}
          />
          <output>{song.tempo}</output>
        </label>
      )}
      {show('key') && (
        <label className="playbar-field">
          <span>Key</span>
          <select aria-label="Key" value={song.key} onChange={(e) => commit((s) => setKey(s, Number(e.target.value)))}>
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
        <button type="button" aria-label="Save WAV" disabled={rendering} onClick={wav}><Download aria-hidden="true" /></button>
      )}
      {onMenu !== null && (
        <button type="button" aria-label="Menu" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={onMenu}><Menu aria-hidden="true" /></button>
      )}
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
