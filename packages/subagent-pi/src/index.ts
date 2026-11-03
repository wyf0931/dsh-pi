/**
 * Named one-shot subagent provider backed by an in-process Pi coding agent.
 * The Pi session is created on delegation and disposed when its turn settles.
 *
 * @module dsh-subagent-pi
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  NO_START_CAPABILITIES,
  type SubagentProvider,
} from '@deepseek-ai/dsh-subagent'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { startPiRun, type PiRunSpec } from './run.ts'

export const name = 'subagent-pi'
export const inject = ['subagents']

const DEFAULT_PROVIDER_NAME = 'pi'

/** Configuration of one in-process Pi subagent provider instance. */
export interface Config {
  /** Name registered on the subagent service (default pi). */
  providerName?: string
  /** Pi global config home; omission uses Pi's own default. */
  agentDir?: string
  /** Model spelled `provider/model`; omission keeps Pi's own selection. */
  model?: string
  /** Thinking level: off, minimal, low, medium, high, xhigh, max. */
  effort?: string
  /** Tool names excluded from every delegated session. */
  disallowedTools?: string[]
  /** Turn deadline in milliseconds after the prompt is accepted. */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
  agentDir: z.string().min(1),
  model: z.string().min(1),
  effort: z.string().min(1),
  disallowedTools: z.array(z.string().min(1)).default([]),
  timeoutMs: z.number().min(1).max(MAX_TIMER_DELAY_MS),
})

/**
 * Register one in-process Pi provider with the shared subagent service.
 * @param ctx - context carrying the shared subagent service.
 * @param config - provider name, Pi home, model and deployment settings.
 */
export function apply(ctx: Context, config: Config): void {
  const providerName = config.providerName ?? DEFAULT_PROVIDER_NAME
  const timeoutMs = config.timeoutMs
  if (timeoutMs !== undefined && timeoutMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`subagent-pi: timeoutMs must be no greater than ${MAX_TIMER_DELAY_MS}`)
  }
  const spec: PiRunSpec = {
    ...(config.agentDir === undefined ? {} : { agentDir: config.agentDir }),
    ...(config.model === undefined ? {} : { model: config.model }),
    ...(config.effort === undefined ? {} : { effort: config.effort }),
    disallowedTools: config.disallowedTools ?? [],
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    onError: (error) => {
      ctx.logger.warn('subagent-pi "%s": %s', providerName, error.message)
    },
  }
  const provider: SubagentProvider = {
    name: providerName,
    capabilities: NO_START_CAPABILITIES,
    inheritsParentContext: false,
    start: request => startPiRun(request, spec),
  }
  ctx.subagents.registerProvider(provider)
}
