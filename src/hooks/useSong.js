import { useState, useEffect, useCallback } from 'react'
import { createDefaultSong } from '../song/model.js'
import { createHistory, push, replace, undo as undoH, redo as redoH } from '../song/history.js'
import { encodeSong, decodeSong } from '../song/codec.js'
import { safeGet, safeSet } from '../storage.js'

const LOAD_ERROR = "Couldn't read that song link, started a new one"

function loadInitial(initial, persist) {
  const fallback = initial ?? createDefaultSong()
  if (!persist) return { song: fallback, loadError: null }
  const hash = location.hash.slice(1)
  if (hash) {
    try {
      return { song: decodeSong(hash), loadError: null }
    } catch {
      return { song: fallback, loadError: LOAD_ERROR }
    }
  }
  const stored = safeGet('bm2.song')
  if (typeof stored === 'string') {
    try {
      return { song: decodeSong(stored), loadError: null }
    } catch {
      // a corrupt stored song falls through to the fallback
    }
  }
  return { song: fallback, loadError: null }
}

// st: { h: history, base: the song before a run of previews, or null }
export function useSong({ initial, persist = true } = {}) {
  const [{ st: first, loadError }] = useState(() => {
    const r = loadInitial(initial, persist)
    return { st: { h: createHistory(r.song), base: null }, loadError: r.loadError }
  })
  const [st, setSt] = useState(first)
  const song = st.h.present

  useEffect(() => {
    if (!persist) return
    const enc = encodeSong(song)
    history.replaceState(null, '', '#' + enc)
    safeSet('bm2.song', enc)
  }, [song, persist])

  const commit = useCallback((fn) => {
    setSt(({ h, base }) => {
      const next = fn(h.present)
      // A run of previews collapses into one step that starts from the pre-preview song.
      return { h: push(base ? replace(h, base) : h, next), base: null }
    })
  }, [])

  const preview = useCallback((fn) => {
    setSt(({ h, base }) => ({ h: replace(h, fn(h.present)), base: base ?? h.present }))
  }, [])

  const undo = useCallback(() => setSt(({ h, base }) => ({ h: undoH(base ? replace(h, base) : h), base: null })), [])
  const redo = useCallback(() => setSt(({ h, base }) => ({ h: redoH(base ? replace(h, base) : h), base: null })), [])

  return { song, commit, preview, undo, redo, canUndo: st.h.past.length > 0, canRedo: st.h.future.length > 0, loadError }
}
