/* eslint-disable react/prop-types -- small learn component */

export default function Goals({ goals, met, revealed, bonus, bonusMet, selfChecked, onHint, onSelfCheck }) {
  const canHint = met.some((m) => !m)
  return (
    <section className="goals" aria-label="Goals">
      <ul className="goals-list">
        {goals.map((g, i) => (
          <li key={g.text} className={met[i] ? 'goals-met' : ''}>
            <span aria-hidden="true">{met[i] ? '✅' : '⬜'}</span>{' '}
            <span>{g.text}</span>
            <span className="visually-hidden">{met[i] ? ', done' : ', not done yet'}</span>
            {revealed.includes(i) && !met[i] && <p className="goals-hint"><span aria-hidden="true">💡 </span><span>{g.hint}</span></p>}
          </li>
        ))}
        {bonus && (
          <li className={`goals-bonus${bonusMet ? ' goals-met' : ''}`}>
            <span aria-hidden="true">{bonusMet ? '🌟' : '⭐'}</span>{' '}
            <span>Bonus: {bonus.text}</span>
          </li>
        )}
      </ul>
      <div className="goals-actions">
        <button type="button" className="learn-btn" onClick={onHint} disabled={!canHint}>Hint</button>
        {bonus?.self && (
          <button type="button" className="learn-btn" aria-pressed={selfChecked} onClick={onSelfCheck}>
            Sounds right to me ✓
          </button>
        )}
      </div>
    </section>
  )
}
