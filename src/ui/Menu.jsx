/* eslint-disable react/prop-types -- internal popover */
import { useEffect, useRef } from 'react'

export default function Menu({ onHome, onCredits, onResetProgress, onNewSong, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      onClose()
      document.querySelector('button[aria-haspopup="dialog"]')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const item = (label, fn) => (
    <button type="button" className="menu-item" onClick={() => { onClose(); fn() }}>{label}</button>
  )
  return (
    <div className="menu" role="dialog" aria-label="Menu" ref={ref}>
      {item('Home', onHome)}
      {item('Credits', onCredits)}
      {item('Reset Learn progress', () => { if (window.confirm('Reset your Learn progress?')) onResetProgress() })}
      {item('New song', () => { if (window.confirm('Start a new song? Your current song will be replaced.')) onNewSong() })}
    </div>
  )
}
