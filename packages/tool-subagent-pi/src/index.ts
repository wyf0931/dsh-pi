/**
 * Model-facing delegation tool for the Pi subagent provider. One tool call
 * starts one in-process Pi session with an independent conversation context.
 *
 * @module dsh-tool-subagent-pi
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-subagent'

export const name = 'tool-subagent-pi'
export const inject = ['tools', 'subagents']

const DEFAULT_TOOL_NAME = 'delegate_pi'
const DEFAULT_PROVIDER_NAME = 'pi'

/** Configuration of the Pi delegation tool. */
export interface Config {
  /** Registered Pi provider name the tool starts activations on (default pi). */
  providerName?: string
  /** Model-facing tool name (default delegate_pi). */
  toolName?: string
}

export const Config: z<Config> = z.object({
  providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
  toolName: z.string().min(1).default(DEFAULT_TOOL_NAME),
})

/**
 * Register a tool that starts one Pi subagent per self-contained task.
 * @param ctx - shared tool registry and managed subagent service.
 * @param config - the target provider and model-facing tool name.
 */
export function apply(ctx: Context, config: Config): void {
  const providerName = config.providerName ?? DEFAULT_PROVIDER_NAME
  const toolName = config.toolName ?? DEFAULT_TOOL_NAME
  const provider = ctx.subagents.getProvider(providerName)
  if (provider !== undefined && (provider.prepareContinuable !== undefined || provider.inheritsParentContext)) {
    throw new Error('delegate_pi requires a one-shot provider with independent conversation context')
  }
  ctx.tools.register(defineTool({
    name: toolName,
    description: 'Delegate a self-contained task to a Pi coding agent. '
      + 'The child works in its own context and does not see this conversation. '
      + 'This tool returns a child id; a later completion notice includes its final answer. '
      + 'The child does not accept follow-up messages. Start independent tasks together and continue useful work while they run. '
      + 'When only waiting for their results remains, end your turn instead of polling.',
    parameters: {
      description: {
        type: 'string',
        required: true,
        description: 'A short description of the delegated task, for display.',
      },
      prompt: {
        type: 'string',
        required: true,
        description: 'The complete, self-contained task. Include all context Pi needs.',
      },
      cwd: {
        type: 'string',
        description: 'Initial child working directory. Relative paths use your current directory; omission inherits it.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', required: true, const: 'activation' },
          subagentId: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `started pi subagent ${value.subagentId}` }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) throw new Error('delegate_pi requires a calling agent')
      const activation = await ctx.subagents.startActivation({
        provider: providerName,
        label: args.description,
        request: {
          parent,
          prompt: [{ type: 'text', text: args.prompt }],
          ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
        },
        signal: exec.signal,
        delivery: 'parent',
      })
      return { kind: 'activation' as const, subagentId: activation.childId }
    },
    presentCall: args => ({ card: 'generic', title: args.description, rawInput: args }),
  }))
}
