/**
 * Controllable in-memory Pi AgentSession double. Tests drive the exact SDK
 * events a real session emits and resolve prompt calls at chosen moments.
 *
 * @module support/mock-session
 */

import { vi } from 'vitest'
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent'

export interface MockAgentSession {
  readonly sessionId: string
  readonly model: { provider: string; id: string } | undefined
  readonly thinkingLevel: string
  subscribe(listener: (event: AgentSessionEvent) => void): () => void
  extensionRunner: { emit: (event: unknown) => Promise<void> }
  prompt(text: string): Promise<void>
  abort(): Promise<void>
  dispose(): void
  /** Test helper: emit one SDK event to subscribers. */
  emit(event: AgentSessionEvent): void
  /** Test helper: whether dispose was called. */
  disposed: boolean
}

type Listener = (event: AgentSessionEvent) => void

export function createMockSession(init?: {
  sessionId?: string
  model?: { provider: string; id: string }
  thinkingLevel?: string
}): MockAgentSession {
  const listeners = new Set<Listener>()
  let promptResolve: (() => void) | undefined
  return {
    sessionId: init?.sessionId ?? 'mock-session-id',
    model: init?.model,
    thinkingLevel: init?.thinkingLevel ?? 'off',
    extensionRunner: { emit: vi.fn(async () => {}) },
    disposed: false,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    prompt() {
      return new Promise<void>((resolve) => {
        promptResolve = resolve
      })
    },
    async abort() {
      promptResolve?.()
    },
    dispose() {
      this.disposed = true
    },
    emit(event) {
      for (const listener of listeners) listener(event)
    },
  }
}

/** Build an assistant text delta session event. */
export function textDelta(delta: string): AgentSessionEvent {
  return {
    type: 'message_update',
    assistantMessageEvent: { type: 'text_delta', delta } as never,
    message: { role: 'assistant', content: [{ type: 'text', text: '' }] },
  } as unknown as AgentSessionEvent
}

/** Build a completed assistant message_end event. */
export function assistantMessageEnd(text: string): AgentSessionEvent {
  return {
    type: 'message_end',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  } as AgentSessionEvent
}

/** Build an agent_settled event. */
export function settled(aborted = false): AgentSessionEvent {
  return { type: 'agent_settled', aborted } as AgentSessionEvent
}
