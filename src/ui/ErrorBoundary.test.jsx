import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary, { restartWithoutHash } from './ErrorBoundary.jsx'

function Boom() {
  throw new Error('boom')
}

afterEach(() => vi.restoreAllMocks())

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows a friendly panel with Start again when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRestart = vi.fn()
    render(<ErrorBoundary onRestart={onRestart}><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('restartWithoutHash drops the hash and reloads', () => {
    history.replaceState(null, '', '/app/?x=1#abc')
    const reload = vi.fn()
    restartWithoutHash({ reload })
    expect(location.hash).toBe('')
    expect(location.pathname + location.search).toBe('/app/?x=1')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
