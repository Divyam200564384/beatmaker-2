/* eslint-disable react/prop-types -- composed screen; props documented in the Task 11 brief */
import { useState, useRef } from 'react'
import PlayBar from './PlayBar.jsx'
import LayerHeader from './LayerHeader.jsx'
import RhythmRings from './RhythmRings.jsx'
import ChordPanel from './ChordPanel.jsx'
import BassPanel from './BassPanel.jsx'
import MelodyGrid from './MelodyGrid.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import './Studio.css'

const LAYERS = [
  { id: 'drums', title: 'Drums', icon: '🥁', tools: ['kick', 'snare', 'hat', 'perc', 'sliders', 'shift', 'kit'] },
  { id: 'chords', title: 'Chords', icon: '🎹', tools: ['chords', 'suggest', 'maj7', 'rhythm'] },
  { id: 'bass', title: 'Bass', icon: '🎸', tools: ['bass'] },
  { id: 'melody', title: 'Melody', icon: '🎤', tools: ['melody', 'melodyTools'] },
]

function engineStatusText(status = {}) {
  const entries = Object.values(status)
  const failed = entries.find((s) => s.state === 'error')
  if (failed) return `Couldn't load ${failed.layer}`
  const loading = entries.filter((s) => s.state === 'loading')
  if (loading.length) {
    const pct = Math.round((loading.reduce((a, s) => a + (s.progress ?? 0), 0) / loading.length) * 100)
    return `Loading… ${pct}%`
  }
  return ''
}

function readyText(status = {}) {
  const entries = Object.values(status)
  return entries.length && entries.every((s) => s.state === 'ready') ? 'All instruments ready' : ''
}

export default function Studio({
  song, commit, preview, engine, tools = null, options = null, hints = [],
  undo, redo, canUndo = false, canRedo = false, onMenu, menuOpen = false, statusText = '',
  onAction, ringHint = null, shareUrl,
}) {
  const wide = useMediaQuery('(min-width: 900px)')
  const [tab, setTab] = useState('drums')
  const tabRefs = useRef({})
  const layers = LAYERS.filter((l) => tools === null || l.tools.some((t) => tools.has(t)))
  const active = layers.find((l) => l.id === tab) ?? layers[0]
  // A phone shows tabs only when there is more than one layer to switch between.
  const tabbed = !wide && layers.length > 1
  // Roving tabindex: arrows, Home and End move the selection and the focus together.
  const onTabKey = (e) => {
    const i = layers.findIndex((l) => l.id === active?.id)
    const last = layers.length - 1
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    setTab(layers[next].id)
    tabRefs.current[layers[next].id]?.focus()
  }
  const step = engine.step >= 0 ? engine.step : null
  const onSound = (layer, n) => {
    if (Array.isArray(n)) n.forEach((x) => engine.preview(layer, x))
    else engine.preview(layer, n)
  }

  // options: null (everything), one id list for every layer, or { drums, chords, bass, melody } lists.
  const optionsFor = (id) => (options && !Array.isArray(options) ? options[id] ?? null : options)

  const panel = (l) => {
    let body = null
    if (l.id === 'drums') body = <RhythmRings song={song} commit={commit} preview={preview} onSound={onSound} step={step} tools={tools} hint={ringHint} onAction={onAction} />
    else if (l.id === 'chords') body = <ChordPanel song={song} commit={commit} onSound={onSound} step={step} tools={tools} />
    else if (l.id === 'bass') body = <BassPanel song={song} commit={commit} onAction={onAction} />
    else body = <MelodyGrid song={song} commit={commit} preview={preview} onSound={onSound} step={step} tools={tools} />
    return (
      <section
        key={l.id} className="studio-panel" id={`panel-${l.id}`} data-state={engine.status?.[l.id]?.state ?? 'idle'}
        style={{ '--layer-color': `var(--${l.id})` }}
        role={tabbed ? 'tabpanel' : undefined} aria-label={tabbed ? l.title : undefined}
      >
        <LayerHeader
          layer={l.id} title={l.title} icon={l.icon} song={song} commit={commit} preview={preview}
          options={optionsFor(l.id)} tools={tools} status={engine.status?.[l.id]} onRetry={() => engine.retry?.(l.id)}
          onAction={onAction}
        />
        {body}
      </section>
    )
  }

  return (
    <div className="studio-root">
      <PlayBar
        song={song} commit={commit} preview={preview}
        playing={engine.playing} onToggle={engine.toggle}
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
        onMenu={onMenu} menuOpen={menuOpen} statusText={engineStatusText(engine.status) || statusText || readyText(engine.status)} tools={tools}
        onShare={() => onAction?.('share')} onWav={() => onAction?.('wav')} shareUrl={shareUrl}
      />
      {hints.map((h) => <p key={h} className="studio-hint" role="note">{h}</p>)}
      <main className={`studio${wide ? ' studio-grid' : ''}${tabbed ? ' studio-tabbed' : ''}`}>
        {wide ? layers.map(panel) : active && panel(active)}
      </main>
      {tabbed && (
        <div className="studio-tabs" role="tablist" aria-label="Layers" onKeyDown={onTabKey}>
          {layers.map((l) => (
            <button
              key={l.id} type="button" role="tab" aria-label={l.title}
              ref={(el) => { tabRefs.current[l.id] = el }}
              aria-selected={l.id === active?.id} aria-controls={`panel-${l.id}`}
              tabIndex={l.id === active?.id ? 0 : -1}
              className="studio-tab" style={{ '--layer-color': `var(--${l.id})` }} onClick={() => setTab(l.id)}
            ><span aria-hidden="true">{l.icon}</span></button>
          ))}
        </div>
      )}
    </div>
  )
}
