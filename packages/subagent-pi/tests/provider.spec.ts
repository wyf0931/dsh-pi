import { Context } from '@deepseek-ai/cordis'
import { SubagentRuntime } from '@deepseek-ai/dsh-subagent'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'
import { mountWorkingDirectoryFixture } from './support/working-directory-fixture.ts'

const sdk = { getAgentDir: vi.fn(() => '/mock/agent-dir') }
vi.mock('../src/sdk.ts', () => ({
  loadPiSdk: vi.fn(async () => sdk),
}))
vi.mock('../src/session.ts', () => ({
  openPiSession: vi.fn(),
  disposeAgentSession: vi.fn(async () => {}),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('subagent-pi provider plugin', () => {
  it('has no default export', () => {
    expect('default' in plugin).toBe(false)
    expect(plugin.name).toBe('subagent-pi')
  })

  it('registers a one-shot provider under the default name', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionProjectionRegistry)
    await mountWorkingDirectoryFixture(ctx)
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(plugin)
    const provider = ctx.subagents.getProvider('pi')
    expect(provider).toBeDefined()
    expect(provider?.inheritsParentContext).toBe(false)
    expect(provider?.capabilities).toEqual({
      agentOptions: false,
      agentPreset: false,
      outputSchema: false,
      depthLimit: false,
    })
    await ctx.fiber.dispose()
  })

  it('registers under a configured provider name', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionProjectionRegistry)
    await mountWorkingDirectoryFixture(ctx)
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(plugin, { providerName: 'custom-pi' })
    expect(ctx.subagents.getProvider('custom-pi')).toBeDefined()
    expect(ctx.subagents.getProvider('pi')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('rejects a timeout above the maximum timer delay', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionProjectionRegistry)
    await mountWorkingDirectoryFixture(ctx)
    await ctx.plugin(SubagentRuntime)
    await expect(ctx.plugin(plugin, { timeoutMs: Number.MAX_SAFE_INTEGER }))
      .rejects.toThrow('timeoutMs')
    await ctx.fiber.dispose()
  })
})
