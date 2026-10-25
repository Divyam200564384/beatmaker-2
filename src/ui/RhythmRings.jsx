/* eslint-disable react/prop-types -- drum editor; props documented in the Task 9 brief */
import { setPerc, setRingEuclid, toggleRingStep } from '../song/model.js'
import RangeSlider from './RangeSlider.jsx'
import './RhythmRings.css'

const RINGS = [
  { id: 'kick', name: 'Kick', color: '#e4572e', r: 92 },
  // The visible label also says clap: Learn level 2 calls this ring the clap. Control names keep 'Snare'.
  { id: 'snare', name: 'Snare', label: 'Snare / clap', color: '#f28b30', r: 72 },
  { id: 'hat', name: 'Hat', color: '#d4a400', r: 52 },
  { id: 'perc', name: 'Perc', color: '#0ea5a4', r: 32 },
]
const PERCS = [['openhat', 'Open hat'], ['tom', 'Tom'], ['cowbell', 'Cowbell'], ['rim', 'Rim']]
// Invisible touch circle (SVG units). The fixed ring radii (92/72/52/32) make a full 44px target
// impossible on a 375px phone: the 24-unit hit circle is ~39px wide there, and radially only ~32px fits between rings,
// so hit circles on neighbouring rings and the inner ring's neighbours overlap. Accepted compromise;
// the viewBox is trimmed to the outer hit circles (±106) and phones let the SVG span the panel.
const HIT_R = 12
const angle = (i) => (i / 16) * 2 * Math.PI - Math.PI / 2
const pos = (r, i) => [Math.cos(angle(i)) * r, Math.sin(angle(i)) * r]

export default function RhythmRings({ song, commit, preview, onSound, step = null, tools = null, hint = null, ringSamples, onAction }) {
  const has = (id) => !tools || tools.has(id)
  const visible = RINGS.filter((r) => has(r.id))
  const cur = step == null ? -1 : step % 16
  const rings = song.drums.rings

  const toggle = (ring, i) => {
    const turningOn = !rings[ring.id].pattern[i]
    commit((s) => toggleRingStep(s, ring.id, i))
    if (turningOn) onSound?.('drums', ring.id)
  }

  const hintRing = hint && RINGS.find((r) => r.id === hint.ring)

  return (
    <div className="rings">
      <svg className="rings-svg" viewBox="-106 -106 212 212" role="group" aria-label="Rhythm rings">
        {visible.map((ring) => (
          <g key={ring.id}>
            <circle r={ring.r} fill="none" stroke="#ece4d6" strokeWidth="2" />
            {rings[ring.id].pattern.map((on, i) => {
              const [x, y] = pos(ring.r, i)
              const big = on && i === cur
              return (
                <g
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`${ring.name} step ${i + 1}, ${on ? 'on' : 'off'}`}
                  aria-pressed={on}
                  className="rings-dot"
                  onClick={() => toggle(ring, i)}
                  onKeyDown={(e) => {
                    if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      toggle(ring, i)
                    }
                  }}
                >
                  <circle cx={x} cy={y} r={HIT_R} fill="transparent" />
                  <circle cx={x} cy={y} r={big ? 9 : on ? 7 : 4} fill={on ? ring.color : '#e3d9c6'} pointerEvents="none" />
                </g>
              )
            })}
          </g>
        ))}
        {cur >= 0 && (
          <line
            x1="0" y1="0" x2={pos(104, cur)[0]} y2={pos(104, cur)[1]}
            stroke="#1d2340" strokeWidth="2" opacity=".35" pointerEvents="none"
          />
        )}
        {hintRing && has(hintRing.id) && (
          <circle
            className="rings-hint" cx={pos(hintRing.r, hint.step)[0]} cy={pos(hintRing.r, hint.step)[1]}
            r="11" fill="none" stroke={hintRing.color} strokeWidth="3" pointerEvents="none"
          />
        )}
      </svg>

      <div className="rings-controls">
        {visible.map((ring) => {
          const r = rings[ring.id]
          const sample = ringSamples?.[ring.id]
          return (
            <section key={ring.id} className="rings-ctl" style={{ '--c': ring.color }}>
              <b>{ring.label ?? ring.name}</b>
              {sample && (
                <span className="rings-sample">
                  {sample.exact ? sample.name : `${sample.name} (closest sound)`}
                </span>
              )}
              {ring.id === 'perc' && (
                <select
                  className="rings-select"
                  aria-label="Percussion sound"
                  value={song.drums.perc}
                  onChange={(e) => { const v = e.target.value; commit((s) => setPerc(s, v)) }}
                >
                  {PERCS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              )}
              {has('sliders') && (
              <label>
                <span>hits {r.hits}</span>
                <RangeSlider
                  label={`${ring.name} hits`} min={0} max={16} value={r.hits}
                  onPreview={(v) => preview((s) => setRingEuclid(s, ring.id, v, s.drums.rings[ring.id].shift))}
                  onCommit={(v) => {
                    commit((s) => setRingEuclid(s, ring.id, v, s.drums.rings[ring.id].shift))
                    if (ring.id === 'hat') onAction?.(`hat-hits:${v}`)
                  }}
                />
              </label>
              )}
              {has('shift') && (
                <label>
                  <span>shift {r.shift}</span>
                  <RangeSlider
                    label={`${ring.name} shift`} min={0} max={15} value={r.shift}
                    onPreview={(v) => preview((s) => setRingEuclid(s, ring.id, s.drums.rings[ring.id].hits, v))}
                    onCommit={(v) => commit((s) => setRingEuclid(s, ring.id, s.drums.rings[ring.id].hits, v))}
                  />
                </label>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
