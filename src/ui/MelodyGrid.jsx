/* eslint-disable react/prop-types -- melody editor; props documented in the Task 10 brief */
import { useEffect, useRef, useState } from 'react'
import { NOTE_NAMES, chordName, melodyRows } from '../music/theory.js'
import { clearMelody, setMelodyCell } from '../song/model.js'
import './LayerPanels.css'

const COLS = 32
const ROWS = 11
const MOVES = [-2, -1, -1, 0, 1, 1, 2]
const noteName = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1)

// Replays cell writes onto a song. Changing a cell's row un-ties a following cell that was tied to it.
function applyWrites(song, writes) {
  return writes.reduce((acc, { col, row, tie }) => {
    let next = setMelodyCell(acc, col, row, tie)
    const old = acc.melody.cells[col]
    const after = acc.melody.cells[col + 1]
    if (old.row !== row && after?.tie) next = setMelodyCell(next, col + 1, after.row, false)
    return next
  }, song)
}

export default function MelodyGrid({ song, commit, preview, onSound, step = null, tools = null, random = Math.random }) {
  const has = (id) => !tools || tools.has(id)
  const canvasRef = useRef(null)
  const stroke = useRef(null)
  const [erase, setErase] = useState(false)
  const [size, setSize] = useState(0)
  const rows = melodyRows(song.key)
  const cells = song.melody.cells
  const curCol = step == null ? -1 : Math.floor(step / 2)

  useEffect(() => {
    const onResize = () => setSize((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth || 640
    const h = canvas.clientHeight || 220
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cw = w / COLS
    const ch = h / ROWS
    ctx.clearRect(0, 0, w, h)
    for (let bar = 0; bar < 4; bar++) {
      ctx.fillStyle = bar % 2 ? '#f6efe0' : '#fbf7ee'
      ctx.fillRect(bar * 8 * cw, 0, 8 * cw, h)
    }
    ctx.strokeStyle = '#e3d9c6'
    ctx.lineWidth = 1
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(w, r * ch); ctx.stroke() }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, h); ctx.stroke() }
    if (curCol >= 0) { ctx.fillStyle = 'rgba(29,35,64,.12)'; ctx.fillRect(curCol * cw, 0, cw, h) }
    ctx.fillStyle = '#059669'
    cells.forEach((cell, c) => {
      if (cell.row < 0) return
      const y = (ROWS - 1 - cell.row) * ch
      ctx.fillRect(c * cw + (cell.tie ? 0 : 1), y + 1, cw - (cell.tie ? 0 : 1), ch - 2)
    })
    ctx.fillStyle = '#1d2340'
    ctx.font = `${Math.max(10, ch * 0.5)}px 'Baloo 2', sans-serif`
    song.chords.prog.forEach((d, bar) => {
      if (d) ctx.fillText(chordName(d, song.key), bar * 8 * cw + 4, h - 3)
    })
  }, [cells, curCol, song.chords.prog, song.key, size])

  const cellAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * COLS)
    const vis = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS)
    if (col < 0 || col >= COLS || vis < 0 || vis >= ROWS) return null
    return { col, row: ROWS - 1 - vis }
  }

  const paint = (e) => {
    const st = stroke.current
    const hit = st && cellAt(e)
    if (!hit) return
    if (hit.col === st.prevCol && hit.row === st.prevRow) return
    // Fast swipes skip columns: walk each one, interpolating the row.
    const from = st.prevCol
    const n = from == null ? 1 : Math.max(1, Math.abs(hit.col - from))
    const startRow = st.prevRow
    const dir = from != null && hit.col < from ? -1 : 1
    for (let i = 1; i <= n; i++) {
      const col = from == null ? hit.col : n === 1 ? hit.col : from + dir * i
      const vis = from == null || n === 1 ? hit.row : Math.round(startRow + ((hit.row - startRow) * i) / n)
      const row = erase ? -1 : vis
      const tie = !erase && st.last != null && col === st.last.col + 1 && vis === st.last.vis
      st.writes.push({ col, row, tie })
      st.last = { col, vis }
    }
    st.prevCol = hit.col
    st.prevRow = hit.row
    const writes = st.writes.slice()
    preview((s) => applyWrites(s, writes))
    if (!erase) onSound?.('melody', rows[hit.row])
  }

  const down = (e) => {
    stroke.current = { writes: [], last: null, prevCol: null, prevRow: null }
    canvasRef.current.setPointerCapture?.(e.pointerId)
    paint(e)
  }
  const end = (e) => {
    const st = stroke.current
    if (!st) return
    stroke.current = null
    canvasRef.current?.releasePointerCapture?.(e.pointerId)
    if (!st.writes.length) return
    const writes = st.writes
    commit((s) => applyWrites(s, writes))
  }

  const idea = () => {
    let row = 5
    const out = []
    for (let c = 0; c < COLS; c++) {
      if (random() < 0.3) { out.push(-1); continue }
      row = Math.min(ROWS - 1, Math.max(0, row + MOVES[Math.floor(random() * MOVES.length)]))
      out.push(row)
    }
    commit((s) => out.reduce((acc, r, c) => setMelodyCell(acc, c, r, false), s))
  }

  const choose = (col, value) => {
    const row = value === '' ? -1 : Number(value)
    commit((s) => applyWrites(s, [{ col, row, tie: false }]))
    if (row >= 0) onSound?.('melody', rows[row])
  }

  return (
    <div className="lp">
      {has('melodyTools') && (
        <div className="lp-seg" role="group" aria-label="Melody tools">
          <button type="button" aria-pressed={erase} className={erase ? 'on' : ''} onClick={() => setErase((v) => !v)}>Eraser</button>
          <button type="button" onClick={() => commit((s) => clearMelody(s))}>Clear</button>
          <button type="button" onClick={idea}>🎲 Idea</button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="lp-canvas"
        role="img"
        aria-label="Melody grid, 32 beats by 11 notes. Use the note lists below for keyboard entry."
        onPointerDown={down}
        onPointerMove={paint}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="lp-sr">
        {cells.map((cell, c) => (
          <span key={c}>
            <select aria-label={`Beat ${c + 1} note`} value={cell.row < 0 ? '' : String(cell.row)} onChange={(e) => choose(c, e.target.value)}>
              <option value="">none</option>
              {rows.map((m, r) => <option key={r} value={String(r)}>{noteName(m)}</option>)}
            </select>
          </span>
        ))}
      </div>
    </div>
  )
}
