/* eslint-disable react/prop-types -- shared header; props documented in the Task 9 brief */
import { CATEGORIES, INSTRUMENTS, KITS } from '../audio/catalog.js'
import { setInstrument, setKit, setMix } from '../song/model.js'
import RangeSlider from './RangeSlider.jsx'
import './LayerHeader.css'

const show = (tools, id) => !tools || tools.has(id)

export default function LayerHeader({ layer, title, song, commit, preview, options = null, tools = null, status, onRetry }) {
  const isDrums = layer === 'drums'
  const mix = song[layer].mix
  const allowed = (id) => !options || options.includes(id)
  const setMixPart = (partial) => commit((s) => setMix(s, layer, partial))

  let picker = null
  if (isDrums && show(tools, 'kit')) {
    picker = (
      <select
        className="layer-header-select"
        aria-label="Drum kit"
        value={song.drums.kit}
        onChange={(e) => { const v = e.target.value; commit((s) => setKit(s, v)) }}
      >
        {KITS.filter((k) => allowed(k.id)).map((k) => (
          <option key={k.id} value={k.id}>{k.label}</option>
        ))}
      </select>
    )
  } else if (!isDrums && show(tools, 'instruments')) {
    picker = (
      <select
        className="layer-header-select"
        aria-label="Instrument"
        value={song[layer].instrument}
        onChange={(e) => { const v = e.target.value; commit((s) => setInstrument(s, layer, v)) }}
      >
        {CATEGORIES.map((cat) => {
          const items = INSTRUMENTS.filter((i) => i.category === cat && allowed(i.id))
          if (!items.length) return null
          return (
            <optgroup key={cat} label={cat}>
              {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </optgroup>
          )
        })}
      </select>
    )
  }

  const showMixer = show(tools, 'mixer')

  return (
    <header className="layer-header" style={{ '--layer-color': `var(--${layer})` }}>
      <h3 className="layer-header-title">{title}</h3>
      {picker}
      {showMixer && (
        <label className="layer-header-field">
          <span>Volume</span>
          <RangeSlider
            label="Volume" min={0} max={100} value={mix.volume}
            onPreview={(v) => preview((s) => setMix(s, layer, { volume: v }))}
            onCommit={(v) => setMixPart({ volume: v })}
          />
        </label>
      )}
      <button
        type="button" className="layer-header-btn" aria-pressed={mix.mute}
        onClick={() => setMixPart({ mute: !mix.mute })}
      >Mute</button>
      {showMixer && (
        <button
          type="button" className="layer-header-btn" aria-pressed={mix.solo}
          onClick={() => setMixPart({ solo: !mix.solo })}
        >Solo</button>
      )}
      {showMixer && (
        <label className="layer-header-field">
          <span>Space</span>
          <RangeSlider
            label="Space" min={0} max={100} value={mix.space}
            onPreview={(v) => preview((s) => setMix(s, layer, { space: v }))}
            onCommit={(v) => setMixPart({ space: v })}
          />
        </label>
      )}
      {status?.state === 'loading' && (
        <span className="layer-header-status" role="status">
          {`Loading… ${Math.round((status.progress ?? 0) * 100)}%`}
        </span>
      )}
      {status?.state === 'error' && (
        <span className="layer-header-status layer-header-error" role="alert">
          {status.message || 'Could not load sounds'}
          <button type="button" className="layer-header-btn" onClick={onRetry}>Retry</button>
        </span>
      )}
    </header>
  )
}
