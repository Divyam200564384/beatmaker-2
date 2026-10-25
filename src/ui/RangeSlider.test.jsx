/* eslint-disable react/prop-types -- test harness */
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import RangeSlider from './RangeSlider.jsx'

function Harness({ onPreview, onCommit }) {
  const [v, setV] = useState(50)
  return (
    <RangeSlider
      label="Level" min={0} max={100} value={v}
      onPreview={(x) => { setV(x); onPreview(x) }} onCommit={onCommit}
    />
  )
}

describe('RangeSlider', () => {
  it('input previews and does not commit', () => {
    const onPreview = vi.fn()
    const onCommit = vi.fn()
    render(<Harness onPreview={onPreview} onCommit={onCommit} />)
    const el = screen.getByLabelText('Level')
    fireEvent.input(el, { target: { value: '60' } })
    fireEvent.input(el, { target: { value: '70' } })
    expect(onPreview).toHaveBeenLastCalledWith(70)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('native change commits once with the number value', () => {
    const onPreview = vi.fn()
    const onCommit = vi.fn()
    render(<Harness onPreview={onPreview} onCommit={onCommit} />)
    const el = screen.getByLabelText('Level')
    fireEvent.input(el, { target: { value: '70' } })
    fireEvent.change(el)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(70)
  })

  it('a release (change) never previews after the commit', () => {
    const order = []
    render(<RangeSlider label="Level" min={0} max={100} value={50} onPreview={() => order.push('preview')} onCommit={() => order.push('commit')} />)
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '80' } })
    expect(order).toEqual(['commit'])
  })
})

