import { Context } from '@deepseek-ai/cordis'
import { SubagentRuntime } from '@deepseek-ai/dsh-subagent'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ToolsService } from '@deepseek-ai/dsh-tools'
import { describe, expect, it, vi } from 'vitest'
import * as tool from '../src/index.ts'
import { mountWorkingDirectoryFixture } from '../../subagent-pi/tests/support/working-directory-fixture.ts'

/**
 * Mount the registries the tool plugin contributes to, then load the tool. The
 * `pi` provider the tool targets is registered as a recording stub, because
 * startActivation resolves the provider inside the shared service.
 */
async function mountTool(toolConfig?: Parameters<typeof tool.apply>[1]) {
  const ctx = new Context()
  await ctx.plugin(SessionProjectionRegistry)
  await mountWorkingDirectoryFixture(ctx)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolsService)
  await ctx.plugin(SubagentRuntime)
  const startActivation = vi.fn(async (spec: { provider: string; label: string }) => ({
    childId: 'child-1' as const,
    messageId: undefined,
    result: Promise.resolve({ output: [] as const, stopReason: 'completed' as const }),
    dispose: vi.fn(async () => {}),
    spec,
  }))
  await ctx.plugin(tool, toolConfig)
  // The tool binds the shared subagent service; swap its startActivation so a
  // test call is observable without a real provider.
  ctx.subagents.startActivation = startActivation as never
  return { ctx, startActivation }
}

describe('tool-subagent-pi', () => {
  it('has no default export and declares its name', () => {
    expect('default' in tool).toBe(false)
    expect(tool.name).toBe('tool-subagent-pi')
  })

  it('registers a delegate_pi tool under the default name', async () => {
    const { ctx } = await mountTool()
    expect(ctx.tools.get('delegate_pi')).toBeDefined()
    await ctx.fiber.dispose()
  })

  it('registers under a configured tool name and provider', async () => {
    const { ctx } = await mountTool({ toolName: 'pi_task', providerName: 'custom' })
    expect(ctx.tools.get('pi_task')).toBeDefined()
    expect(ctx.tools.get('delegate_pi')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('declares a prompt, description, and optional cwd', async () => {
    const { ctx } = await mountTool()
    const schema = ctx.tools.schemas().find(t => t.name === 'delegate_pi')
    expect(schema?.parameters.required).toEqual(['description', 'prompt'])
    expect(Object.keys(schema?.parameters.properties as Record<string, unknown>).sort())
      .toEqual(['cwd', 'description', 'prompt'])
    await ctx.fiber.dispose()
  })

  it('starts a pi activation when executed', async () => {
    const { startActivation, ctx } = await mountTool()
    const toolDef = ctx.tools.get('delegate_pi')
    expect(toolDef).toBeDefined()
    const output = await toolDef?.execute(
      { description: 'Do a thing', prompt: 'task text' },
      {
        signal: new AbortController().signal,
        agent: { id: 'parent-1' } as never,
      } as never,
    )
    expect(output).toEqual({ kind: 'activation', subagentId: 'child-1' })
    expect(startActivation).toHaveBeenCalledTimes(1)
    await ctx.fiber.dispose()
  })
})
