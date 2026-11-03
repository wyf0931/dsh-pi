import { describe, expect, it } from 'vitest'
import { PiSubagentFailure, toError } from '../src/failures.ts'

describe('PiSubagentFailure', () => {
  it('records stage and category', () => {
    const failure = new PiSubagentFailure('turn', 'timeout')
    expect(failure.stage).toBe('turn')
    expect(failure.category).toBe('timeout')
    expect(failure.name).toBe('PiSubagentFailure')
    expect(failure.message).toContain('stage: turn')
    expect(failure.message).toContain('category: timeout')
  })

  it('gives stage-specific advice', () => {
    expect(new PiSubagentFailure('installation', 'not-found').message).toContain('Install')
    expect(new PiSubagentFailure('startup', 'unknown').message).toContain('authentication')
  })

  it('retains the native cause', () => {
    const cause = new Error('native')
    const failure = new PiSubagentFailure('abort', 'unknown', { cause })
    expect(failure.cause).toBe(cause)
  })
})

describe('toError', () => {
  it('returns an Error unchanged', () => {
    const error = new Error('x')
    expect(toError(error)).toBe(error)
  })

  it('wraps a string throw', () => {
    expect(toError('boom').message).toBe('boom')
  })

  it('stringifies a non-Error throw', () => {
    expect(toError(42).message).toBe('42')
  })
})
