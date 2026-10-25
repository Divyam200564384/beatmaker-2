/* eslint-disable react/prop-types -- internal screen */
import './Home.css'

const A = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>
const BY_SA = 'https://creativecommons.org/licenses/by-sa/3.0/'
const BY = 'https://creativecommons.org/licenses/by/3.0/'

export default function Credits({ onBack }) {
  return (
    <div className="home credits">
      <button type="button" className="home-link" onClick={onBack}>Back</button>
      <h1>Credits</h1>
      <ul className="credits-list">
        <li><A href="https://github.com/danigb/smplr">smplr</A> (MIT)</li>
        <li>
          Soundfonts from <A href="https://github.com/gleitz/midi-js-soundfonts">gleitz/midi-js-soundfonts</A>:{' '}
          MusyngKite soundfont, via gleitz/midi-js-soundfonts, <A href={BY_SA}>CC BY-SA 3.0</A>;{' '}
          FluidR3_GM soundfont by Frank Wen, <A href={BY}>CC BY 3.0</A>
        </li>
        <li>Splendid Grand Piano (AKAI samples, public domain)</li>
        <li>smpldsnds drum-machines (public domain)</li>
        <li>Sonic Pi samples (CC0)</li>
        <li><A href="https://divyam200564384.github.io/beatmaker/">Beatmaker v1</A></li>
      </ul>
    </div>
  )
}
