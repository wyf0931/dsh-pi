/**
 * One-shot Pi execution, answer selection, and owned session disposal. Pi runs
 * in this process through its SDK; the parent session receives only the final
 * assistant text and fixed failure facts.
 *
 * @module dsh-subagent-pi/run
 */

import { randomUUID } from 'node:crypto'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import {
  assertUsableCwd,
  settleRunResult,
  subprocessRunHandle,
  type ResolvedSubagentStartRequest,
  type SubagentResult,
  type SubagentRun,
  type SubagentStopReason,
} from '@deepseek-ai/dsh-subagent'
import { resolveAgentDir } from './environment.ts'
import { PiSubagentFailure, toError } from './failures.ts'
import { loadPiSdk, type PiSdk } from './sdk.ts'
import { disposeAgentSession, openPiSession, type PiSessionOptions } from './session.ts'
import { createAnswerCollector, textTask } from './task.ts'

/** Resolved deployment settings shared by every delegation of one provider instance. */
export interface PiRunSpec {
  /** Pi global config home; omission uses Pi's own default. */
  readonly agentDir?: string
  /** Model spelled `provider/model`; omission keeps Pi's own selection. */
  readonly model?: string
  /** Thinking level; omission keeps Pi's own selection. */
  readonly effort?: string
  /** Tool names excluded from every delegated session. */
  readonly disallowedTools?: readonly string[]
  /** Turn deadline in milliseconds after the prompt is accepted; omission cancels with the parent only. */
  readonly timeoutMs?: number
  /** Receives safe summaries; native causes stay on the underlying Error. */
  readonly onError?: (error: Error, stopReason: SubagentStopReason) => void
}

type AgentSession = PiSdk['AgentSession']['prototype']

/** Snapshot the collector's current answer as content blocks. */
function answerBlocks(answer: string): readonly ContentBlock[] {
  return answer.length === 0 ? [] : [{ type: 'text', text: answer }]
}

function reportFailure(spec: PiRunSpec, error: PiSubagentFailure): void {
  try {
    spec.onError?.(error, 'error')
  } catch {
    // A diagnostic observer cannot replace the run's result or cleanup failure.
  }
}

/**
 * Publish one live Pi session as a seam SubagentRun. The published result never
 * rejects: turn failures settle as `stopReason: 'error'`, and cancellation as
 * `aborted`.
 */
function publishRun(
  session: AgentSession,
  prompt: string,
  request: ResolvedSubagentStartRequest,
  spec: PiRunSpec,
): SubagentRun {
  const stopped = Promise.withResolvers<SubagentResult>()
  const collector = createAnswerCollector()
  let phase: 'running' | 'cancelled' | 'timeout' | 'settled' = 'running'
  let disposal: Promise<void> | undefined

  const collectOutput = () => answerBlocks(collector.answer())
  const dispose = (): Promise<void> => disposal ??= disposeAgentSession(session)
  const abort = async (): Promise<void> => {
    try {
      await session.abort()
    } catch (error: unknown) {
      reportFailure(spec, new PiSubagentFailure('abort', 'unknown', { cause: error }))
    }
  }
  const interrupt = (reason: 'cancelled' | 'timeout'): void => {
    if (phase !== 'running') return
    phase = reason
    stopped.resolve({
      output: collectOutput(),
      stopReason: reason === 'cancelled' ? 'aborted' : 'error',
      ...reason === 'timeout' ? {
        diagnostic: 'Pi subagent exceeded its execution timeout. Increase timeoutMs or use a smaller task.',
      } : {},
    })
    void abort()
    void dispose().catch(() => {})
  }
  const onAbort = (): void => { interrupt('cancelled') }

  const unsubscribe = session.subscribe((event) => {
    switch (event.type) {
      case 'message_update': {
        const deltaEvent = event.assistantMessageEvent
        if (deltaEvent.type === 'text_delta') collector.delta(deltaEvent.delta)
        break
      }
      case 'message_end': {
        if (event.message.role === 'assistant') collector.message(event.message)
        break
      }
      case 'agent_settled': {
        if (phase !== 'running') break
        phase = 'settled'
        stopped.resolve({
          output: collectOutput(),
          stopReason: event.aborted ? 'aborted' : 'completed',
        })
        break
      }
      default:
        break
    }
  })

  request.signal.addEventListener('abort', onAbort, { once: true })
  if (request.signal.aborted) onAbort()
  const timer = spec.timeoutMs === undefined ? undefined : setTimeout(() => { interrupt('timeout') }, spec.timeoutMs)

  const runTurn = async (): Promise<SubagentResult> => {
    try {
      await session.prompt(prompt)
    } catch (error: unknown) {
      // Pi rejected the prompt or the run failed without an agent_settled event.
      return {
        output: collectOutput(),
        stopReason: 'error',
        diagnostic: new PiSubagentFailure('turn', 'unknown', { cause: error }).message,
      }
    }
    return stopped.promise
  }

  const result = settleRunResult({
    attempt: async () => {
      if (phase !== 'running') return stopped.promise
      return Promise.race([runTurn(), stopped.promise])
    },
    collectOutput,
    collectDiagnostic: () => new PiSubagentFailure('turn', 'unknown').message,
    cancelled: () => phase === 'cancelled',
    onError: spec.onError,
    signal: request.signal,
    onAbort,
  }).finally(() => {
    clearTimeout(timer)
    unsubscribe()
    if (phase === 'running') phase = 'settled'
  })

  return subprocessRunHandle({
    id: brandString<SessionId>(randomUUID()),
    result,
    signal: request.signal,
    onAbort,
    requestCancel: onAbort,
    teardown: async () => {
      await dispose()
      await result
    },
  })
}

/**
 * Open one in-process Pi session and return its one-shot run handle.
 * Cancellation during startup disposes the partial session before rejection.
 * @param request - text task, resolved child directory, parent, cancellation.
 * @param spec - resolved deployment settings shared by one provider instance.
 * @returns the run after the Pi session is bound; post-publication failures settle through result.
 */
export async function startPiRun(
  request: ResolvedSubagentStartRequest,
  spec: PiRunSpec,
): Promise<SubagentRun> {
  const prompt = textTask(request.prompt)
  if (request.signal.aborted) throw new PiSubagentFailure('startup', 'cancelled')
  const cwd = assertUsableCwd('subagent-pi', 'child cwd', request.cwd)

  const sdk = await loadPiSdk()
  if (request.signal.aborted) throw new PiSubagentFailure('startup', 'cancelled')

  const options: PiSessionOptions = {
    cwd,
    agentDir: resolveAgentDir(() => spec.agentDir ?? sdk.getAgentDir()),
    ...(spec.model === undefined ? {} : { model: spec.model }),
    ...(spec.effort === undefined ? {} : { effort: spec.effort }),
    ...(spec.disallowedTools === undefined ? {} : { disallowedTools: spec.disallowedTools }),
  }

  let session: AgentSession
  try {
    session = await openPiSession(sdk, options)
  } catch (error: unknown) {
    if (request.signal.aborted) throw new PiSubagentFailure('startup', 'cancelled')
    throw error
  }

  if (request.signal.aborted) {
    await disposeAgentSession(session)
    throw new PiSubagentFailure('startup', 'cancelled')
  }

  let run: SubagentRun
  try {
    run = publishRun(session, prompt, request, spec)
  } catch (error: unknown) {
    await disposeAgentSession(session)
    throw new PiSubagentFailure('startup', 'unknown', { cause: error })
  }
  if (request.signal.aborted) {
    await run.dispose()
    throw new PiSubagentFailure('startup', 'cancelled')
  }
  return run
}

export { PiSubagentFailure, toError }
