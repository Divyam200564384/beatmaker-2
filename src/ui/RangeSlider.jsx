/* eslint-disable react/prop-types -- small reusable control; props documented above */
import { useEffect, useRef } from 'react'

// Previews on every input event; commits once on release (native `change`).
// React's onChange fires on each input tick for ranges, so it only previews.
export default function RangeSlider({ value, min, max, step, onPreview, onCommit, label, ...rest }) {
  const ref = useRef(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    const el = ref.current
    const handler = (e) => commitRef.current?.(Number(e.target.value))
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [])

  return (
    <input
      {...rest}
      ref={ref}
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onPreview?.(Number(e.target.value))}
    />
  )
}
