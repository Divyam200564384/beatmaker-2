/* eslint-disable react/prop-types -- internal screen */
import './Home.css'

export default function Home({ onLearn, onStudio, onCredits, learnLabel = 'Start', graduate = false }) {
  return (
    <div className="home">
      <h1 className="home-title">Beatmaker 2</h1>
      <p className="home-sub">Make music in your browser.</p>
      <div className="home-cards">
        <section className="home-card home-card--learn">
          <h2><span aria-hidden="true">🎓 </span>Learn</h2>
          {graduate && <span className="graduate-badge">🎓 Graduate</span>}
          <p>Never made music? Start here. 15 short levels build a song one layer at a time.</p>
          <button type="button" className="home-btn" onClick={onLearn}>{learnLabel}</button>
        </section>
        <section className="home-card home-card--free">
          <h2><span aria-hidden="true">🎛️ </span>Free play</h2>
          <p>Everything unlocked: drums, chords, bass and melody. Just create.</p>
          <button type="button" className="home-btn" onClick={onStudio}>Open studio</button>
        </section>
      </div>
      <button type="button" className="home-link" onClick={onCredits}>Credits</button>
    </div>
  )
}
