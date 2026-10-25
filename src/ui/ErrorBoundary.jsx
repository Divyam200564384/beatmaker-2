/* eslint-disable react/prop-types -- top-level safety net */
import { Component } from 'react'
import './Home.css'

// Reloads the app without the song hash, so a bad link can't crash it again.
export function restartWithoutHash(loc = location) {
  history.replaceState(null, '', location.pathname + location.search)
  loc.reload()
}

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Beatmaker crashed', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const restart = this.props.onRestart ?? (() => restartWithoutHash())
    return (
      <div className="home" role="alert">
        <h1 className="home-title">Something went wrong</h1>
        <p className="home-sub">Sorry! Beatmaker hit a problem it couldn&apos;t recover from.</p>
        <button type="button" className="home-btn" onClick={restart}>Start again</button>
      </div>
    )
  }
}
