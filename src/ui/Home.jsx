/* eslint-disable react/prop-types -- internal screen */
import './Home.css'

export default function Home({ onLearn, onStudio, onCredits, learnLabel = 'Start' }) {
  return (
    <div className="home">
      <h1 className="home-title">Beatmaker 2</h1>
      <p className="home-sub">Make music in your browser.</p>
      <div className="home-cards">
        <section className="home-card">
          <h2>🎓 Learn</h2>
          <p>Never made music? Start here. Short lessons build a song one layer at a time.</p>
          <button type="button" className="home-btn" onClick={onLearn}>{learnLabel}</button>
        </section>
        <section className="home-card">
          <h2>🎛️ Free play</h2>
          <p>Jump straight in with drums, chords, bass and melody.</p>
          <button type="button" className="home-btn" onClick={onStudio}>Open studio</button>
        </section>
      </div>
      <button type="button" className="home-link" onClick={onCredits}>Credits</button>
    </div>
  )
}
