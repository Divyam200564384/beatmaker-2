import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeGet, safeSet } from './storage.js'

afterEach(() => vi.restoreAllMocks())

describe('storage', () => {
  it('round-trips JSON values', () => {
    safeSet('k', { a: 1 })
    expect(safeGet('k')).toEqual({ a: 1 })
  })
  it('safeGet returns null when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x') })
    expect(safeGet('k')).toBeNull()
  })
  it('safeSet returns false when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x') })
    expect(safeSet('k', 1)).toBe(false)
  })
})
