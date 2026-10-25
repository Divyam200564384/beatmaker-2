import { useState, useEffect, useRef, useCallback } from 'react'
import { createEngine } from '../audio/engine.js'

export function useEngine(song) {
  const engineRef = useRef(null)
  const songRef = useRef(song)
  const [playing, setPlaying] = useState(false)
  const [step, setStep] = useState(-1)
  const [status, setStatus] = useState({})

  // Created lazily: engine.start/preview are what create the AudioContext, on a user gesture.
  const get = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = createEngine({
        onStep: setStep,
        onStatus: (s) => setStatus((prev) => ({ ...prev, [s.layer]: s })),
      })
      engineRef.current.setSong(songRef.current)
    }
    return engineRef.current
  }, [])

  useEffect(() => {
    songRef.current = song
    engineRef.current?.setSong(song)
  }, [song])

  useEffect(() => () => engineRef.current?.stop(), [])

  const toggle = useCallback(async () => {
    const engine = get()
    if (playing) {
      engine.stop()
      setPlaying(false)
      setStep(-1)
      return
    }
    setPlaying(true)
    try {
      await engine.start(songRef.current)
    } catch {
      setPlaying(false)
    }
  }, [get, playing])

  const preview = useCallback((layer, note) => get().preview(layer, note), [get])

  const retry = useCallback((layer) => get().retry(layer), [get])

  return { playing, toggle, step, status, preview, retry }
}
