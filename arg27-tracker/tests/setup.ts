import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
})
// Canvas text metrics are only used for timeline label packing in these DOM tests.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({ measureText: (s: string) => ({ width: s.length * 7 }) })),
})
Element.prototype.scrollIntoView = vi.fn()
