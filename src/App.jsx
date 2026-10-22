import { useState } from 'react'
import PlayBar from './ui/PlayBar.jsx'
import { useSong } from './hooks/useSong.js'
import { useEngine } from './hooks/useEngine.js'

function engineStatusText(status) {
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

export default function App() {
  const { song, commit, preview, undo, redo, canUndo, canRedo, loadError } = useSong()
  const engine = useEngine(song)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <PlayBar
        song={song} commit={commit} preview={preview}
        playing={engine.playing} onToggle={engine.toggle}
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
        onMenu={() => setMenuOpen((o) => !o)}
        statusText={engineStatusText(engine.status) || loadError || ''}
        tools={null}
      />
      <main className="studio" data-menu-open={menuOpen}>
        <p>The studio is coming soon.</p>
      </main>
    </>
  )
}
