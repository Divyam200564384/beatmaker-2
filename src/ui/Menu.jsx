/* eslint-disable react/prop-types -- internal popover */
export default function Menu({ onHome, onCredits, onResetProgress, onNewSong, onClose }) {
  const item = (label, fn) => (
    <button type="button" className="menu-item" onClick={() => { onClose(); fn() }}>{label}</button>
  )
  return (
    <div className="menu" role="dialog" aria-label="Menu">
      {item('Home', onHome)}
      {item('Credits', onCredits)}
      {item('Reset Learn progress', () => { if (window.confirm('Reset your Learn progress?')) onResetProgress() })}
      {item('New song', () => { if (window.confirm('Start a new song? Your current song will be replaced.')) onNewSong() })}
    </div>
  )
}
