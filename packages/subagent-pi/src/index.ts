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

export const Config = z.object({
  providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
  agentDir: z.string().min(1),
  // Volatile fields appear in the Plugins page's configuration form and apply
  // to the next delegation without remounting this provider.
  model: z.string().min(1).volatile(),
  effort: z.string().min(1).volatile(),
  disallowedTools: z.array(z.string().min(1)).default([]).volatile(),
  timeoutMs: z.number().min(1).max(MAX_TIMER_DELAY_MS).volatile(),
})

/**
 * The resolved config the Loader passes to `apply`: every volatile field is a
 * stable reference whose `get()` returns the value currently saved in the
 * profile's configuration layer.
 */
export type ResolvedConfig = ReturnType<typeof Config>

/**
 * Read the live deployment settings for one delegation. Every value is read at
 * start time so a settings-form write applies to the next delegation.
 * @param config - the plugin config carrying volatile references.
 * @returns the resolved one-shot run settings.
 */
function readSpec(config: ResolvedConfig): PiRunSpec {
  const model = config.model?.get()
  const effort = config.effort?.get()
  const timeoutMs = config.timeoutMs?.get()
  if (timeoutMs !== undefined && timeoutMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`subagent-pi: timeoutMs must be no greater than ${MAX_TIMER_DELAY_MS}`)
  }
  return {
    ...(config.agentDir === undefined ? {} : { agentDir: config.agentDir }),
    ...(model === undefined ? {} : { model }),
    ...(effort === undefined ? {} : { effort }),
    disallowedTools: config.disallowedTools?.get() ?? [],
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  }
}

/**
 * Register one in-process Pi provider with the shared subagent service.
 * @param ctx - context carrying the shared subagent service.
 * @param config - provider name, Pi home, model and deployment settings.
 */
export function apply(ctx: Context, config: ResolvedConfig): void {
  const providerName = config.providerName ?? DEFAULT_PROVIDER_NAME
  const spec = (): PiRunSpec => ({
    ...readSpec(config),
    onError: (error) => {
      ctx.logger.warn('subagent-pi "%s": %s', providerName, error.message)
    },
  })
  const provider: SubagentProvider = {
    name: providerName,
    capabilities: NO_START_CAPABILITIES,
    inheritsParentContext: false,
    start: request => startPiRun(request, spec()),
  }
  ctx.subagents.registerProvider(provider)
}
