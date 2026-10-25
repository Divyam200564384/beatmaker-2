import { useState, useEffect, useCallback, useRef } from 'react'
import { createDefaultSong } from '../song/model.js'
import { createHistory, push, replace, undo as undoH, redo as redoH } from '../song/history.js'
import { encodeSong, decodeSong } from '../song/codec.js'
import { safeGet, safeSet } from '../storage.js'

const LOAD_ERROR = "Couldn't read that song link, started a new one"
export const KEPT_NOTICE = 'Your previous song is one Undo away.'
// Hash + autosave writes wait for a pause: WebKit throws after ~100 replaceState calls in a short window.
export const SAVE_DELAY_MS = 300

function decodeStored() {
  const stored = safeGet('bm2.song')
  if (typeof stored !== 'string') return null
  try {
    return { enc: stored, song: decodeSong(stored) }
  } catch {
    return null // a corrupt stored song is ignored
  }
}

// past: songs to seed history with; openedLink: the page was entered via a song link that is not the autosave.
function loadInitial(initial, persist) {
  const fallback = initial ?? createDefaultSong()
  const none = { song: fallback, past: [], loadError: null, notice: null, openedLink: false }
  if (!persist) return none
  const hash = location.hash.slice(1)
  const stored = decodeStored()
  if (hash) {
    const openedLink = !stored || stored.enc !== hash
    let song
    try {
      song = decodeSong(hash)
    } catch {
      return { ...none, loadError: LOAD_ERROR, openedLink }
    }
    // Opening someone's link keeps the autosaved song one Undo away instead of overwriting it.
    if (stored && encodeSong(stored.song) !== encodeSong(song)) {
      return { ...none, song, past: [stored.song], notice: KEPT_NOTICE, openedLink }
    }
    return { ...none, song, openedLink }
  }
  return stored ? { ...none, song: stored.song } : none
}

function writeSong(song) {
  try {
    const enc = encodeSong(song)
    history.replaceState(null, '', '#' + enc)
    safeSet('bm2.song', enc)
  } catch {
    // A failed hash/autosave write must never take the app down.
  }
}

// st: { h: history, base: the song before a run of previews, or null }
export function useSong({ initial, persist = true } = {}) {
  const [{ st: first, loadError, notice, openedLink }] = useState(() => {
    const r = loadInitial(initial, persist)
    return { st: { h: { ...createHistory(r.song), past: r.past }, base: null }, loadError: r.loadError, notice: r.notice, openedLink: r.openedLink }
  })
  const [st, setSt] = useState(first)
  const song = st.h.present

  const pending = useRef(null)
  const flush = useCallback(() => {
    const s = pending.current
    if (!s) return
    pending.current = null
    writeSong(s)
  }, [])

  useEffect(() => {
    if (!persist) return
    pending.current = song
    const t = setTimeout(flush, SAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [song, persist, flush])

  // Leaving the page (or unmounting) writes whatever is still waiting.
  useEffect(() => {
    if (!persist) return
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [persist, flush])

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

  return {
    song, commit, preview, undo, redo,
    canUndo: st.h.past.length > 0, canRedo: st.h.future.length > 0,
    // true while a slider drag (a run of previews) has not been committed yet
    previewing: st.base !== null,
    loadError, notice, openedLink,
  }
}
