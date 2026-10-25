/* eslint-disable react/prop-types -- shared header; props documented in the Task 9 brief */
import { CATEGORIES, INSTRUMENTS, KITS, soundLabel } from '../audio/catalog.js'
import { setInstrument, setKit, setMix } from '../song/model.js'
import RangeSlider from './RangeSlider.jsx'
import './LayerHeader.css'

const show = (tools, id) => !tools || tools.has(id)

export default function LayerHeader({ layer, title, icon, song, commit, preview, options = null, tools = null, status, onRetry, onAction }) {
  const isDrums = layer === 'drums'
  const mix = song[layer].mix
  // The current choice always stays listed so the controlled select never shows a wrong value.
  const current = isDrums ? song.drums.kit : song[layer].instrument
  const allowed = (id) => !options || options.includes(id) || id === current
  const setMixPart = (partial, action) => {
    commit((s) => setMix(s, layer, partial))
    onAction?.(action)
  }

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
        onChange={(e) => { const v = e.target.value; commit((s) => setInstrument(s, layer, v)); onAction?.(`instrument:${layer}`) }}
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
      <h3 className="layer-header-title">{icon && <span aria-hidden="true">{icon} </span>}{title}</h3>
      {picker}
      {status?.state === 'loading' && (
        <span className="layer-header-status" role="status">
          {`Loading… ${Math.round((status.progress ?? 0) * 100)}%`}
        </span>
      )}
      {status?.state === 'error' && (
        <span className="layer-header-status layer-header-error" role="alert">
          {`Couldn't load ${soundLabel(layer, status.id ?? current)}. `}
          <button type="button" className="layer-header-btn" onClick={onRetry}>Retry</button>
        </span>
      )}
      <div className={`layer-header-mix${showMixer ? ' full' : ''}`}>
        {showMixer && (
          <label className="layer-header-field">
            <span>Volume</span>
            <RangeSlider
              label="Volume" min={0} max={100} value={mix.volume}
              onPreview={(v) => preview((s) => setMix(s, layer, { volume: v }))}
              onCommit={(v) => setMixPart({ volume: v }, 'volume')}
            />
          </label>
        )}
        <button
          type="button" className="layer-header-btn" aria-pressed={mix.mute}
          onClick={() => setMixPart({ mute: !mix.mute }, `${mix.mute ? 'unmute' : 'mute'}:${layer}`)}
        >Mute</button>
        {showMixer && (
          <button
            type="button" className="layer-header-btn" aria-pressed={mix.solo}
            onClick={() => setMixPart({ solo: !mix.solo }, 'solo')}
          >Solo</button>
        )}
        {showMixer && (
          <label className="layer-header-field">
            <span>Space</span>
            <RangeSlider
              label="Space" min={0} max={100} value={mix.space}
              onPreview={(v) => preview((s) => setMix(s, layer, { space: v }))}
              onCommit={(v) => setMixPart({ space: v }, 'space')}
            />
          </label>
        )}
      </div>
    </header>
  )
}
