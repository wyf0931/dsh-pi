/**
 * Open the in-process Pi AgentSession wrapped by one delegation. The sequence
 * mirrors the standalone Pi startup: services first (which load the agent
 * directory's extensions and register their providers into the model runtime),
 * then the session against an explicit session manager, with model and
 * thinking-level read-back before extensions bind.
 *
 * @module dsh-subagent-pi/session
 */

import type { ThinkingLevel } from '@earendil-works/pi-agent-core'
import type { Api, Model } from '@earendil-works/pi-ai'
import type { PiSdk } from './sdk.ts'
import { resolveSessionDir } from './environment.ts'
import { PiSubagentFailure } from './failures.ts'

/** Deployment-independent startup inputs resolved from plugin config. */
export interface PiSessionOptions {
  /** Absolute workspace directory of the delegated task. */
  readonly cwd: string
  /** Resolved Pi global config home. */
  readonly agentDir: string
  /** Optional model spelled `provider/model`; omission keeps Pi's own selection. */
  readonly model?: string
  /** Optional thinking level; omission keeps Pi's own selection. */
  readonly effort?: string
  /** Tool names to exclude from the session. */
  readonly disallowedTools?: readonly string[]
}

const THINKING_LEVELS = new Set([
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
])

/**
 * Validate a configured thinking level before Pi sees it. Pi clamps an unknown
 * word to the model's lowest level without a word, so leaving validation to Pi
 * would make the configured choice silently not apply.
 * @param effort - the configured thinking level.
 * @returns the same level when Pi recognizes it.
 */
export function assertThinkingLevel(effort: string): string {
  if (!THINKING_LEVELS.has(effort)) {
    throw new PiSubagentFailure('startup', 'misconfigured', {
      cause: new Error(`Pi has no thinking level ${effort} (levels: ${[...THINKING_LEVELS].join(', ')})`),
    })
  }
  return effort
}

/**
 * Open one Pi AgentSession.
 * @param sdk - the lazily imported Pi SDK module.
 * @param options - cwd, agent directory, optional model/thinking level/tool exclusions.
 * @returns the live AgentSession. The caller owns disposal.
 */
export async function openPiSession(
  sdk: PiSdk,
  options: PiSessionOptions,
): Promise<PiSdk['AgentSession']['prototype']> {
  const { cwd, agentDir } = options
  const thinkingLevel: ThinkingLevel | undefined = options.effort === undefined
    ? undefined
    : assertThinkingLevel(options.effort) as ThinkingLevel
  const settingsManager = sdk.SettingsManager.create(cwd, agentDir)
  // Pre-trust the task cwd the same way Pi's own Trust action would. An
  // embedded session has no human to answer a trust prompt; an unanswered
  // prompt is a permanent wait, not a safety boundary.
  new sdk.ProjectTrustStore(agentDir).set(cwd, true)
  const services = await sdk.createAgentSessionServices({ cwd, agentDir, settingsManager })
  const sessionDir = resolveSessionDir(cwd, agentDir)
  const sessionManager = sdk.SessionManager.create(cwd, sessionDir)
  const model = options.model === undefined
    ? undefined
    : resolveConfiguredModel(services.modelRuntime, options.model)
  let session: PiSdk['AgentSession']['prototype']
  try {
    ({ session } = await sdk.createAgentSessionFromServices({
      services,
      sessionManager,
      ...(model === undefined ? {} : { model }),
      ...(thinkingLevel === undefined ? {} : { thinkingLevel: thinkingLevel as ThinkingLevel }),
      ...(options.disallowedTools === undefined || options.disallowedTools.length === 0
        ? {}
        : { excludeTools: [...options.disallowedTools] }),
    }))
  } catch (error: unknown) {
    const failure = new PiSubagentFailure('startup', 'unknown', { cause: error })
    throw failure
  }
  // Read back rather than trust the request: the model and thinking level in
  // the session are the runtime's report of what actually applies.
  const effectiveModel = effectiveModelId(session)
  if (options.model !== undefined && effectiveModel !== options.model) {
    session.dispose()
    throw new PiSubagentFailure('startup', 'misconfigured', {
      cause: new Error(`Pi did not apply model ${options.model}: the session reports ${effectiveModel ?? 'no model'}`),
    })
  }
  if (thinkingLevel !== undefined && session.thinkingLevel !== thinkingLevel) {
    session.dispose()
    throw new PiSubagentFailure('startup', 'misconfigured', {
      cause: new Error(`Pi runs thinking level ${session.thinkingLevel} although ${thinkingLevel} was requested`),
    })
  }
  try {
    await session.bindExtensions({})
  } catch (error: unknown) {
    await disposeAgentSession(session)
    throw new PiSubagentFailure('startup', 'unknown', { cause: error })
  }
  return session
}

function resolveConfiguredModel(
  runtime: PiSdk['ModelRuntime']['prototype'],
  modelId: string,
): Model<Api> {
  const slash = modelId.indexOf('/')
  if (slash <= 0 || slash === modelId.length - 1) {
    throw new PiSubagentFailure('startup', 'misconfigured', {
      cause: new Error(`Pi model must be spelled provider/model; got ${JSON.stringify(modelId)}`),
    })
  }
  const provider = modelId.slice(0, slash)
  const id = modelId.slice(slash + 1)
  const found = runtime.getModel(provider, id)
  if (found === undefined) {
    throw new PiSubagentFailure('startup', 'misconfigured', {
      cause: new Error(`Pi model ${modelId} is not registered: provider ${provider} has no model ${id}`),
    })
  }
  return found
}

function effectiveModelId(session: PiSdk['AgentSession']['prototype']): string | null {
  const { model } = session
  return model === undefined ? null : `${model.provider}/${model.id}`
}

/**
 * Shut down one Pi session and wait for its extensions. A shutdown hook that
 * does not settle within 10 seconds is reported and disposal continues, so an
 * untrusted extension cannot hold the delegating turn forever.
 * @param session - the live AgentSession.
 */
export async function disposeAgentSession(
  session: PiSdk['AgentSession']['prototype'],
): Promise<void> {
  const deadline = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), 10_000)
  })
  try {
    const settled = await Promise.race([
      session.extensionRunner.emit({ type: 'session_shutdown', reason: 'quit' }).then(() => true),
      deadline,
    ])
    if (!settled) {
      process.emitWarning(
        `Pi session_shutdown hooks timed out after 10000 ms for session ${session.sessionId}; disposing without waiting`,
        { code: 'DSH_PI_SHUTDOWN_TIMEOUT' },
      )
    }
  } finally {
    session.dispose()
  }
}
