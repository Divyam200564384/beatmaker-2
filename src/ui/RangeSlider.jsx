/* eslint-disable react/prop-types -- small reusable control; props documented above */
import { useEffect, useRef } from 'react'

// Previews on every input event; commits once on release (native `change`).
// React's onChange fires on each input tick for ranges, so it only previews.
export default function RangeSlider({ value, min, max, step, onPreview, onCommit, label, style, ...rest }) {
  const ref = useRef(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    const el = ref.current
    const handler = (e) => commitRef.current?.(Number(e.target.value))
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [])

  // --fill lets the CSS paint the part of the track left of the thumb.
  const fill = max > min ? ((Number(value) - min) / (max - min)) * 100 : 0
  return (
    <input
      {...rest}
      ref={ref}
      type="range"
      style={{ ...style, '--fill': `${fill}%` }}
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      // A native `change` is the release: the listener above commits it, so it must not preview afterwards
      // (a trailing preview would leave the song mid-drag).
      onChange={(e) => { if (e.nativeEvent?.type !== 'change') onPreview?.(Number(e.target.value)) }}
    />
  )
}
