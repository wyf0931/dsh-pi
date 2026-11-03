/**
 * Typed failure classification for the Pi subagent provider. Every stage of a
 * delegation produces a localized, actionable error; native error causes are
 * retained on the Error for local debugging and never copied into the
 * model-facing diagnostic, because they can contain credentials.
 *
 * @module dsh-subagent-pi/failures
 */

/** The delegation stage at which a failure occurred. */
export type PiFailureStage = 'installation' | 'startup' | 'turn' | 'abort' | 'dispose'

/** Machine-readable failure category within a stage. */
export type PiFailureCategory =
  | 'not-found'
  | 'unsupported'
  | 'cancelled'
  | 'timeout'
  | 'misconfigured'
  | 'unknown'

const failureAdvice: Readonly<Record<PiFailureStage, string>> = {
  installation: 'Install @earendil-works/pi-coding-agent before retrying.',
  startup: 'Check the Pi installation, authentication, and launch settings.',
  turn: 'Check the selected model and its account before retrying.',
  abort: 'Pi did not accept interruption; session disposal was requested.',
  dispose: 'The Pi session may still be active; check it before starting another task.',
}

/** Structured Pi provider failure with its stage and category. */
export class PiSubagentFailure extends Error {
  readonly stage: PiFailureStage
  readonly category: PiFailureCategory

  /**
   * @param stage - the delegation stage that failed.
   * @param category - machine-readable failure category.
   * @param options - standard Error options (used to retain the native cause).
   */
  constructor(stage: PiFailureStage, category: PiFailureCategory, options?: ErrorOptions) {
    super(`Pi subagent failure (stage: ${stage}; category: ${category}). ${failureAdvice[stage]}`, options)
    this.name = 'PiSubagentFailure'
    this.stage = stage
    this.category = category
  }
}

/**
 * Normalize a thrown value to an Error. Rejected SDK calls surface Error
 * instances; the String arm is a defensive fallback for a non-Error throw the
 * typed SDK surface cannot produce.
 * @param value - the caught value.
 * @returns the value as an Error.
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}
