/**
 * Input validation and answer text extraction for one-shot Pi delegations.
 * These are pure functions so every rule is testable without opening a Pi
 * session.
 *
 * @module dsh-subagent-pi/task
 */

import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/**
 * Validate one text task before opening a Pi session: every block is a text
 * block and the joined text is non-empty after trimming.
 * @param prompt - content supplied by the shared subagent service.
 * @returns the text blocks joined in their original order.
 */
export function textTask(prompt: readonly ContentBlock[]): string {
  if (prompt.length === 0) {
    throw new Error('subagent-pi: the one-shot task must contain only text blocks')
  }
  const texts: string[] = []
  for (const block of prompt) {
    if (block.type !== 'text') {
      throw new Error('subagent-pi: the one-shot task must contain only text blocks')
    }
    texts.push(block.text)
  }
  const joined = texts.join('')
  if (joined.trim().length === 0) {
    throw new Error('subagent-pi: the one-shot task must not be empty')
  }
  return joined
}

/** Extract the concatenated text content of an assistant message. */
function assistantText(message: { readonly content: ReadonlyArray<{ readonly type: string; readonly text?: string }> }): string {
  let text = ''
  for (const block of message.content) {
    if (block.type === 'text' && block.text !== undefined) {
      text += block.text
    }
  }
  return text
}

/**
 * State accumulated while a delegated turn streams. The Pi SDK emits both
 * streamed text deltas and complete messages; complete non-empty assistant
 * messages win over the delta stream, matching the shared {@link SubagentResult}
 * rule "last non-empty assistant message, else the accumulated text stream".
 */
export interface AnswerCollector {
  /** Record a text delta from the streaming response. */
  delta(text: string): void
  /** Record a completed assistant message. */
  message(message: { readonly content: ReadonlyArray<{ readonly type: string; readonly text?: string }> }): void
  /** Read the currently selected answer text. */
  answer(): string
}

/**
 * Create an answer collector for one delegated turn.
 * @returns a collector that prefers the last non-empty completed message.
 */
export function createAnswerCollector(): AnswerCollector {
  let streamed = ''
  let lastMessage = ''
  return {
    delta(text) {
      streamed += text
    },
    message(message) {
      const text = assistantText(message)
      if (text.trim().length > 0) lastMessage = text
    },
    answer() {
      return lastMessage !== '' ? lastMessage : streamed
    },
  }
}
