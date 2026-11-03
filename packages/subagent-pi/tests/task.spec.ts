import { describe, expect, it } from 'vitest'
import { createAnswerCollector, textTask } from '../src/task.ts'

describe('textTask', () => {
  it('joins multiple text blocks in order', () => {
    expect(textTask([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('ab')
  })

  it('rejects an empty prompt', () => {
    expect(() => textTask([])).toThrow('only text blocks')
  })

  it('rejects a non-text block', () => {
    expect(() => textTask([
      { type: 'text', text: 'a' },
      { type: 'image', attachment: { id: 'x', bytes: Buffer.alloc(0), mimeType: 'image/png' } as never },
    ]))
      .toThrow('only text blocks')
  })

  it('rejects whitespace-only text', () => {
    expect(() => textTask([{ type: 'text', text: '   ' }])).toThrow('not be empty')
  })

  it('accepts surrounding whitespace around content', () => {
    expect(textTask([{ type: 'text', text: '  x  ' }])).toBe('  x  ')
  })
})

describe('createAnswerCollector', () => {
  it('returns the streamed delta when no message completes', () => {
    const collector = createAnswerCollector()
    collector.delta('hello')
    expect(collector.answer()).toBe('hello')
  })

  it('accumulates streamed deltas', () => {
    const collector = createAnswerCollector()
    collector.delta('foo')
    collector.delta('bar')
    expect(collector.answer()).toBe('foobar')
  })

  it('prefers the last non-empty completed message', () => {
    const collector = createAnswerCollector()
    collector.delta('streamed')
    collector.message({ content: [{ type: 'text', text: 'done' }] })
    expect(collector.answer()).toBe('done')
  })

  it('uses the later non-empty message', () => {
    const collector = createAnswerCollector()
    collector.message({ content: [{ type: 'text', text: 'first' }] })
    collector.message({ content: [{ type: 'text', text: 'second' }] })
    expect(collector.answer()).toBe('second')
  })

  it('ignores an empty completed message and keeps deltas', () => {
    const collector = createAnswerCollector()
    collector.delta('streamed')
    collector.message({ content: [{ type: 'text', text: '   ' }] })
    expect(collector.answer()).toBe('streamed')
  })

  it('reads only text blocks of a message', () => {
    const collector = createAnswerCollector()
    collector.message({ content: [
      { type: 'text', text: 'visible' },
    ] })
    expect(collector.answer()).toBe('visible')
  })

  it('returns empty when nothing was recorded', () => {
    expect(createAnswerCollector().answer()).toBe('')
  })
})
