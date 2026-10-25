/* eslint-disable react/prop-types -- small learn component */
import { useState } from 'react'

// Turns "a **b** c" into text and <strong> pieces (odd split indices are the bold parts).
function renderBold(text) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))
}

export default function Coach({ lines }) {
  const [i, setI] = useState(0)
  const last = i >= lines.length - 1
  return (
    <section className="coach" aria-label="Coach">
      <span className="coach-owl" aria-hidden="true">🦉</span>
      <p className="coach-bubble" aria-live="polite">{renderBold(lines[i])}</p>
      {!last && (
        <button type="button" className="learn-btn" onClick={() => setI((n) => n + 1)}>Next</button>
      )}
    </section>
  )
}
