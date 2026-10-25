import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MelodyGrid from './MelodyGrid.jsx'
import { createDefaultSong } from '../song/model.js'

beforeAll(() => {
  window.PointerEvent = class extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1 }
  }
})

// canvas box 320x110 => each cell 10x10; row 10 is the top
const setup = (props = {}) => {
  const p = { song: createDefaultSong(), commit: vi.fn(), preview: vi.fn(), onSound: vi.fn(), step: null, tools: null, ...props }
  const view = render(<MelodyGrid {...p} />)
  const canvas = view.container.querySelector('canvas')
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 110, right: 320, bottom: 110, x: 0, y: 0 })
  return { p, canvas }
}
const at = (col, row) => ({ clientX: col * 10 + 5, clientY: (10 - row) * 10 + 5 })

describe('MelodyGrid', () => {
  it('a stroke across cols 0-2 on row 0 is one commit with ties', () => {
    const { p, canvas } = setup()
    fireEvent.pointerDown(canvas, at(0, 0))
    fireEvent.pointerMove(canvas, at(1, 0))
    fireEvent.pointerMove(canvas, at(2, 0))
    expect(p.commit).not.toHaveBeenCalled()
    expect(p.preview).toHaveBeenCalled()
    fireEvent.pointerUp(canvas, at(2, 0))
    expect(p.commit).toHaveBeenCalledTimes(1)
    const cells = p.commit.mock.calls[0][0](p.song).melody.cells
    expect(cells.slice(0, 3).map((c) => c.row)).toEqual([0, 0, 0])
    expect(cells.slice(0, 3).map((c) => c.tie)).toEqual([false, true, true])
    expect(p.onSound).toHaveBeenCalledWith('melody', 60)
  })

  it('a cancelled stroke still commits', () => {
    const { p, canvas } = setup()
    fireEvent.pointerDown(canvas, at(0, 3))
    fireEvent.pointerCancel(canvas, at(0, 3))
    expect(p.commit).toHaveBeenCalledTimes(1)
  })

  it('eraser strokes set row -1', () => {
    const song = createDefaultSong()
    song.melody.cells[0] = { row: 4, tie: false }
    const { p, canvas } = setup({ song })
    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }))
    fireEvent.pointerDown(canvas, at(0, 4))
    fireEvent.pointerUp(canvas, at(0, 4))
    expect(p.commit.mock.calls[0][0](song).melody.cells[0].row).toBe(-1)
  })

  it('Clear empties the melody', () => {
    const song = createDefaultSong()
    song.melody.cells[2] = { row: 4, tie: false }
    const { p } = setup({ song })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(p.commit.mock.calls[0][0](song).melody.cells.every((c) => c.row === -1)).toBe(true)
  })

  it('Idea is deterministic with injected random (all 0.9 walks up and clamps)', () => {
    const { p } = setup({ random: () => 0.9 })
    fireEvent.click(screen.getByRole('button', { name: /Idea/ }))
    expect(p.commit).toHaveBeenCalledTimes(1)
    const rows = p.commit.mock.calls[0][0](p.song).melody.cells.map((c) => c.row)
    expect(rows.slice(0, 6)).toEqual([7, 9, 10, 10, 10, 10])
    expect(rows).toHaveLength(32)
  })

  it('Idea with all rests', () => {
    const { p } = setup({ random: () => 0.1 })
    fireEvent.click(screen.getByRole('button', { name: /Idea/ }))
    expect(p.commit.mock.calls[0][0](p.song).melody.cells.every((c) => c.row === -1)).toBe(true)
  })

  it('has 32 hidden column selects and changing one commits', () => {
    const { p } = setup()
    expect(screen.getAllByRole('combobox')).toHaveLength(32)
    fireEvent.change(screen.getByLabelText('Beat 2 note'), { target: { value: '3' } })
    expect(p.commit).toHaveBeenCalledTimes(1)
    expect(p.commit.mock.calls[0][0](p.song).melody.cells[1]).toEqual({ row: 3, tie: false })
    expect(p.onSound).toHaveBeenCalled()
  })

  it('a fast swipe from col 0 to col 3 fills skipped columns as a held note', () => {
    const { p, canvas } = setup()
    fireEvent.pointerDown(canvas, at(0, 0))
    fireEvent.pointerMove(canvas, at(3, 0))
    fireEvent.pointerUp(canvas, at(3, 0))
    expect(p.commit).toHaveBeenCalledTimes(1)
    const cells = p.commit.mock.calls[0][0](p.song).melody.cells
    expect(cells.slice(0, 4).map((c) => c.row)).toEqual([0, 0, 0, 0])
    expect(cells.slice(0, 4).map((c) => c.tie)).toEqual([false, true, true, true])
  })

  it('a fast diagonal swipe interpolates rows and sounds only the landing cell', () => {
    const { p, canvas } = setup()
    fireEvent.pointerDown(canvas, at(0, 0))
    p.onSound.mockClear()
    fireEvent.pointerMove(canvas, at(4, 4))
    fireEvent.pointerUp(canvas, at(4, 4))
    const cells = p.commit.mock.calls[0][0](p.song).melody.cells
    expect(cells.slice(0, 5).map((c) => c.row)).toEqual([0, 1, 2, 3, 4])
    expect(p.onSound).toHaveBeenCalledTimes(1)
  })

  it('changes made to the song mid-stroke survive the commit', () => {
    const { p, canvas } = setup()
    fireEvent.pointerDown(canvas, at(0, 2))
    fireEvent.pointerUp(canvas, at(0, 2))
    const changed = { ...p.song, tempo: 120 }
    const out = p.commit.mock.calls[0][0](changed)
    expect(out.tempo).toBe(120)
    expect(out.melody.cells[0].row).toBe(2)
  })

  it('changing a cell row un-ties the following tied cell', () => {
    const song = createDefaultSong()
    song.melody.cells[0] = { row: 2, tie: false }
    song.melody.cells[1] = { row: 2, tie: true }
    const { p, canvas } = setup({ song })
    fireEvent.pointerDown(canvas, at(0, 5))
    fireEvent.pointerUp(canvas, at(0, 5))
    const cells = p.commit.mock.calls[0][0](song).melody.cells
    expect(cells[0].row).toBe(5)
    expect(cells[1]).toEqual({ row: 2, tie: false })
  })

  it('the hidden selects become visible on focus', () => {
    const css = readFileSync('src/ui/LayerPanels.css', 'utf8')
    expect(css).toMatch(/\.lp-sr:focus-within/)
  })

  it('hides buttons without melodyTools', () => {
    setup({ tools: new Set(['melody']) })
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })
})
