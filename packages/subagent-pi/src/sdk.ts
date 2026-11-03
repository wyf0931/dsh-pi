/**
 * Type surface of the lazily imported Pi coding agent SDK. Importing the SDK
 * dynamically keeps plugin load cheap and gives one resolution point for the
 * installation probe.
 *
 * @module dsh-subagent-pi/sdk
 */

import { PiSubagentFailure } from './failures.ts'

/** The Pi coding agent SDK module shape consumed by this provider. */
export type PiSdk = typeof import('@earendil-works/pi-coding-agent')

/**
 * Import the Pi SDK and verify it is installed. A failed resolution is a
 * typed installation failure rather than a bare module-not-found error.
 * @returns the Pi SDK module.
 */
export async function loadPiSdk(): Promise<PiSdk> {
  try {
    return await import('@earendil-works/pi-coding-agent')
  } catch (error: unknown) {
    throw new PiSubagentFailure('installation', 'not-found', { cause: error })
  }
}
