import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has no matchMedia: answer "(min-width: Npx)" from window.innerWidth and follow resize events.
if (!window.matchMedia) {
  window.matchMedia = (query) => {
    const m = /\(min-width:\s*(\d+)px\)/.exec(query)
    const compute = () => (m ? window.innerWidth >= Number(m[1]) : false)
    const wrapped = new Map()
    return {
      get matches() { return compute() },
      media: query,
      addEventListener(_t, cb) {
        const fn = () => cb({ matches: compute(), media: query })
        wrapped.set(cb, fn)
        window.addEventListener('resize', fn)
      },
      removeEventListener(_t, cb) {
        window.removeEventListener('resize', wrapped.get(cb))
        wrapped.delete(cb)
      },
    }
  }
}
