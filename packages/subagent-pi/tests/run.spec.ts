import { Context } from '@deepseek-ai/cordis'
import { SubagentRuntime, type ResolvedSubagentStartRequest } from '@deepseek-ai/dsh-subagent'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountWorkingDirectoryFixture } from './support/working-directory-fixture.ts'
import {
  assistantMessageEnd,
  createMockSession,
  settled,
  textDelta,
  type MockAgentSession,
} from './support/mock-session.ts'

// Mock the SDK loader and session opener so the run logic is tested against a
// controllable session without loading the real SDK or touching the network.
const sdk = {
  getAgentDir: vi.fn(() => '/mock/agent-dir'),
}
vi.mock('../src/sdk.ts', () => ({
  loadPiSdk: vi.fn(async () => sdk),
}))

let mockSession: MockAgentSession
vi.mock('../src/session.ts', async () => {
  const actual = await vi.importActual<typeof import('../src/session.ts')>('../src/session.ts')
  return {
    ...actual,
    openPiSession: vi.fn(async () => mockSession),
  }
})

const { startPiRun } = await import('../src/run.ts')

function request(signal: AbortSignal): ResolvedSubagentStartRequest {
  return {
    parent: {} as never,
    cwd: process.cwd(),
    signal,
    prompt: [{ type: 'text', text: 'Do the task.' }],
  }
}

async function mountSubagents(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionProjectionRegistry)
  await mountWorkingDirectoryFixture(ctx)
  await ctx.plugin(SubagentRuntime)
  return ctx
}

beforeEach(() => {
  mockSession = createMockSession({
    model: { provider: 'deepseek', id: 'v4' },
    thinkingLevel: 'off',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('startPiRun', () => {
  it('returns the final assistant text when the turn completes', async () => {
    const controller = new AbortController()
    const ctx = await mountSubagents()
    const run = await startPiRun(request(controller.signal), {})
    mockSession.emit(textDelta('partial'))
    mockSession.emit(assistantMessageEnd('the answer'))
    mockSession.emit(settled())
    const result = await run.result
    await run.dispose()
    expect(result.stopReason).toBe('completed')
    expect(result.output).toEqual([{ type: 'text', text: 'the answer' }])
    expect(mockSession.disposed).toBe(true)
    await ctx.fiber.dispose()
  })

  it('falls back to streamed deltas when no completed message exists', async () => {
    const controller = new AbortController()
    const run = await startPiRun(request(controller.signal), {})
    mockSession.emit(textDelta('streamed only'))
    mockSession.emit(settled())
    const result = await run.result
    expect(result.stopReason).toBe('completed')
    expect(result.output).toEqual([{ type: 'text', text: 'streamed only' }])
    await run.dispose()
  })

  it('maps an aborted settlement to the aborted stop reason', async () => {
    const controller = new AbortController()
    const run = await startPiRun(request(controller.signal), {})
    mockSession.emit(settled(true))
    const result = await run.result
    expect(result.stopReason).toBe('aborted')
    await run.dispose()
  })

  it('cancels a published run through the request signal', async () => {
    const controller = new AbortController()
    const run = await startPiRun(request(controller.signal), {})
    controller.abort()
    const result = await run.result
    expect(result.stopReason).toBe('aborted')
    expect(mockSession.disposed).toBe(true)
  })

  it('rejects when the task contains no text blocks', async () => {
    const controller = new AbortController()
    const badRequest = { ...request(controller.signal), prompt: [] }
    await expect(startPiRun(badRequest, {})).rejects.toThrow('only text blocks')
  })

  it('rejects when the cwd is not absolute', async () => {
    const controller = new AbortController()
    const badRequest = { ...request(controller.signal), cwd: 'relative/path' }
    await expect(startPiRun(badRequest, {})).rejects.toThrow('must be an absolute path')
  })
})
