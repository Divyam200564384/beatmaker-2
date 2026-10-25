/* eslint-disable react/prop-types -- learn screen */
import { LEVELS, WORLDS } from '../../learn/levels.js'
import { isUnlocked } from '../../learn/progress.js'
import './Learn.css'

function nodeName(level, progress) {
  const { id, title } = level
  if (!isUnlocked(progress, id)) return `Level ${id}, locked`
  const n = progress.stars[id] ?? 0
  if (n > 0) return `Level ${id}, ${title}, ${n} ${n === 1 ? 'star' : 'stars'}`
  if (id === progress.current) return `Level ${id}, current`
  return `Level ${id}, ${title}`
}

export default function LevelMap({ progress, onOpen, onBack }) {
  return (
    <div className="map">
      <div className="map-top">
        <button type="button" className="home-link" onClick={onBack}>Back</button>
        <h1 className="map-title">🎓 Learn</h1>
      </div>
      {WORLDS.map((name, w) => (
        <section key={name} className="map-world" aria-labelledby={`world-${w + 1}`}>
          <h2 id={`world-${w + 1}`} className="map-world-title">World {w + 1} · {name}</h2>
          <div className="map-row">
            {LEVELS.filter((l) => l.world === w + 1).map((l) => {
              const open = isUnlocked(progress, l.id)
              const current = l.id === progress.current && !progress.stars[l.id]
              const n = progress.stars[l.id] ?? 0
              return (
                <button
                  key={l.id} type="button" disabled={!open}
                  className={`map-node${current ? ' current' : ''}${open ? '' : ' locked'}`}
                  aria-label={nodeName(l, progress)} aria-current={current ? 'step' : undefined}
                  onClick={() => onOpen(l.id)}
                >
                  <span className="map-node-num" aria-hidden="true">{open ? l.id : '🔒'}</span>
                  <span className="map-node-title" aria-hidden="true">{l.title}</span>
                  <span className="map-node-stars" aria-hidden="true">{open ? '⭐'.repeat(n) + '☆'.repeat(3 - n) : ''}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
