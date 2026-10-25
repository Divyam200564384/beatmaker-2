import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import Lesson from './Lesson.jsx'
import { LEVELS } from '../../learn/levels.js'

const fresh = { stars: {}, current: 1 }
const makeEngine = () => ({
  playing: false, toggle: vi.fn(), stop: vi.fn(), setSource: vi.fn(), step: -1, status: {}, preview: vi.fn(),
})
const lesson = (level, props = {}) => render(
  <Lesson level={level} progress={fresh} onDone={vi.fn()} onExit={vi.fn()} engine={makeEngine()} {...props} />,
)
const goal = (text) => screen.getByText(text).closest('li')
const setHits = (ring, n) => fireEvent.change(screen.getByLabelText(`${ring} hits`), { target: { value: String(n) } })
const celebration = () => screen.getByRole('region', { name: 'Level complete' })
// Stars are read out as visually hidden text; the emoji row itself is hidden from screen readers.
const expectStars = (n, emoji) => {
  const text = within(celebration()).getByText(`${n} ${n === 1 ? 'star' : 'stars'}`)
  expect(text).toHaveClass('visually-hidden')
  const row = text.closest('p')
  expect(row).not.toHaveAttribute('aria-label')
  expect(row.querySelector('[aria-hidden="true"]')).toHaveTextContent(new RegExp(`^${emoji}$`))
}

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
})

describe('Lesson', () => {
  it('level 1 shows only the kick ring and its sliders', () => {
    lesson(LEVELS[0])
    expect(screen.getByLabelText('Kick hits')).toBeInTheDocument()
    expect(screen.queryByLabelText('Kick shift')).toBeNull()
    expect(screen.queryByLabelText('Snare hits')).toBeNull()
    expect(screen.queryByRole('button', { name: /Snare step 1,/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Chords' })).toBeNull()
    expect(screen.getByText('World 1 · Level 1 · Heartbeat')).toBeInTheDocument()
  })

  it('level 1: 4 hits meets the goal and earns 2 stars', () => {
    const onDone = vi.fn()
    lesson(LEVELS[0], { onDone })
    expect(goal('Give the kick 4 even hits')).toHaveTextContent('⬜')
    expect(screen.queryByRole('region', { name: 'Level complete' })).toBeNull()
    setHits('Kick', 4)
    expect(goal('Give the kick 4 even hits')).toHaveTextContent('✅')
    expectStars(2, '⭐⭐')
    fireEvent.click(within(celebration()).getByRole('button', { name: 'Next level ▶' }))
    expect(onDone).toHaveBeenCalledWith(2)
  })

  it('a self bonus adds the third star', () => {
    lesson(LEVELS[0])
    setHits('Kick', 4)
    fireEvent.click(screen.getByRole('button', { name: 'Sounds right to me ✓' }))
    expectStars(3, '⭐⭐⭐')
  })

  it('pressing Hint then meeting the goal earns 1 star', () => {
    lesson(LEVELS[0])
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText("Slide the kick's hits slider to 4.")).toBeInTheDocument()
    setHits('Kick', 4)
    expectStars(1, '⭐')
  })

  it('coach shows bubbles one at a time with bold text', () => {
    lesson(LEVELS[0])
    expect(screen.getByText('Every song has a heartbeat you can nod to.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByText('Every song has a heartbeat you can nod to.')).toBeNull()
    expect(screen.getByText('hits', { selector: 'strong' })).toBeInTheDocument()
  })

  it('level 6 quiz: wrong answer shows the message, right answer meets the goal', () => {
    lesson(LEVELS[5])
    fireEvent.click(screen.getByRole('button', { name: 'A' }))
    expect(screen.getByText('Listen again. That one sounds happy.')).toBeInTheDocument()
    expect(goal('Pick the sad one')).toHaveTextContent('⬜')
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(goal('Pick the sad one')).toHaveTextContent('✅')
  })

  it('compare buttons play their patch through the engine without changing the song', () => {
    const engine = makeEngine()
    lesson(LEVELS[1], { engine })
    fireEvent.click(screen.getByRole('button', { name: 'Kick + clap' }))
    const played = engine.setSource.mock.calls.at(-1)[0]
    expect(played.drums.rings.snare.pattern[4]).toBe(true)
    expect(engine.toggle).toHaveBeenCalledTimes(1)
    expect(goal("Clap at 3 o'clock")).toHaveTextContent('⬜')
  })

  it('level 2 glows the 3 o\'clock clap dot first', () => {
    const { container } = lesson(LEVELS[1])
    expect(container.querySelector('.rings-hint')).not.toBeNull()
  })

  it('logs panel actions: level 10 mute then unmute the bass', () => {
    lesson(LEVELS[9])
    const bass = screen.getByRole('heading', { name: 'Bass' }).closest('header')
    fireEvent.click(within(bass).getByRole('button', { name: 'Mute' }))
    expect(goal('Mute the bass')).toHaveTextContent('✅')
    fireEvent.click(within(bass).getByRole('button', { name: 'Mute' }))
    expect(goal('Unmute it')).toHaveTextContent('✅')
  })

  it('level 3 logs hat hits on commit', () => {
    lesson(LEVELS[2])
    setHits('Hat', 3)
    expect(goal('Calm: 4 hits or fewer')).toHaveTextContent('✅')
    setHits('Hat', 10)
    expect(goal('Busy: 8 hits or more')).toHaveTextContent('✅')
  })

  it('does not touch the saved song or the URL', () => {
    localStorage.setItem('bm2.song', 'keep')
    lesson(LEVELS[0])
    setHits('Kick', 4)
    expect(localStorage.getItem('bm2.song')).toBe('keep')
    expect(location.hash).toBe('')
  })

  it('level 13 chord picker offers every instrument', () => {
    lesson(LEVELS[12])
    const chords = screen.getByRole('heading', { name: 'Chords' }).closest('header')
    expect(within(chords).getByLabelText('Instrument').querySelectorAll('option')).toHaveLength(129)
  })

  it('earned stars stay after a goal becomes unmet again, and Hint stays off', () => {
    lesson(LEVELS[0])
    setHits('Kick', 4)
    expectStars(2, '⭐⭐')
    setHits('Kick', 3)
    expect(goal('Give the kick 4 even hits')).toHaveTextContent('⬜')
    expect(screen.getByRole('button', { name: 'Hint' })).toBeDisabled()
    expectStars(2, '⭐⭐')
  })

  it('undo leaves compare mode and plays the lesson song again', () => {
    const engine = { ...makeEngine(), playing: true }
    lesson({ ...LEVELS[1], tools: [...LEVELS[1].tools, 'undo'] }, { engine })
    fireEvent.click(screen.getByRole('button', { name: 'Snare step 5, off' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kick alone' }))
    expect(screen.getByRole('button', { name: 'Kick alone' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Kick alone' })).toHaveAttribute('aria-pressed', 'false')
    const src = engine.setSource.mock.calls.at(-1)[0]
    expect(src.drums.rings.snare.pattern[4]).toBe(false)
    expect(src.drums.rings.kick.pattern.some(Boolean)).toBe(true)
  })

  it('exit calls onExit and leaving stops playback', () => {
    const engine = makeEngine()
    const onExit = vi.fn()
    const { unmount } = lesson(LEVELS[0], { engine, onExit })
    fireEvent.click(screen.getByRole('button', { name: 'Exit lesson' }))
    expect(onExit).toHaveBeenCalled()
    unmount()
    expect(engine.stop).toHaveBeenCalled()
  })

  it('level 1: a drag that passes 4 and is released at 8 does not complete the level', () => {
    lesson(LEVELS[0])
    const slider = screen.getByLabelText('Kick hits')
    fireEvent.input(slider, { target: { value: '4' } })
    fireEvent.input(slider, { target: { value: '8' } })
    fireEvent.change(slider, { target: { value: '8' } })
    expect(goal('Give the kick 4 even hits')).toHaveTextContent('⬜')
    expect(screen.queryByRole('region', { name: 'Level complete' })).toBeNull()
  })

  it('level 1: a drag released at 4 completes the level', () => {
    lesson(LEVELS[0])
    const slider = screen.getByLabelText('Kick hits')
    fireEvent.input(slider, { target: { value: '2' } })
    fireEvent.input(slider, { target: { value: '4' } })
    expect(screen.queryByRole('region', { name: 'Level complete' })).toBeNull()
    fireEvent.change(slider, { target: { value: '4' } })
    expect(goal('Give the kick 4 even hits')).toHaveTextContent('✅')
    expectStars(2, '⭐⭐')
  })

  it('level 5: "Sounds right to me" meets both feeling goals', () => {
    lesson(LEVELS[4])
    expect(goal('Few kicks: 3 or fewer')).toHaveTextContent('⬜')
    fireEvent.click(screen.getByRole('button', { name: 'Sounds right to me ✓' }))
    expect(goal('Few kicks: 3 or fewer')).toHaveTextContent('✅')
    expect(goal('Slow tempo: 90 or less')).toHaveTextContent('✅')
    expect(celebration()).toBeInTheDocument()
  })

  it('level 8: the self-check button shows and only meets the dreamy-chord goal', () => {
    lesson(LEVELS[7])
    fireEvent.click(screen.getByRole('button', { name: 'Sounds right to me ✓' }))
    expect(goal('Use a dreamy chord')).toHaveTextContent('✅')
    expect(goal('Start sad')).toHaveTextContent('⬜')
    expect(screen.queryByRole('region', { name: 'Level complete' })).toBeNull()
  })

  it('level 9: the self-check button meets the sad-chords goal', () => {
    lesson(LEVELS[8])
    fireEvent.click(screen.getByRole('button', { name: 'Sounds right to me ✓' }))
    expect(goal('At least 2 sad chords')).toHaveTextContent('✅')
    expect(celebration()).toBeInTheDocument()
  })

  it('levels without feeling goals or a self bonus have no self-check button', () => {
    lesson(LEVELS[1])
    expect(screen.queryByRole('button', { name: 'Sounds right to me ✓' })).toBeNull()
  })

  it('level 15 celebration names the learner a graduate', () => {
    lesson({ ...LEVELS[14], goals: [{ text: 'Done', hint: 'Nothing to do here.', check: () => true }] })
    expect(within(celebration()).getByText("You're a Beatmaker graduate! 🎓")).toBeInTheDocument()
  })

  it('other levels do not show the graduation line', () => {
    lesson(LEVELS[0])
    setHits('Kick', 4)
    expect(within(celebration()).queryByText(/graduate/)).toBeNull()
  })
})

