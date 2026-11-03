/**
 * Resolve the Pi global configuration home and per-cwd session directory.
 * Mirrors OAR's Pi runtime resolution without the OAR-specific env variable.
 *
 * @module dsh-subagent-pi/environment
 */

import { join, resolve } from 'node:path'

/**
 * The Pi global config home (auth.json, models.json, settings, sessions).
 * `PI_CODING_AGENT_DIR` wins when non-empty; an empty value is treated as unset,
 * the same way Pi treats it, because keeping it would join into relative paths
 * and put auth.json in the working directory.
 * @param fallback - Pi's own default, from `getAgentDir()`.
 * @returns the configured or default agent directory.
 */
export function resolveAgentDir(fallback: () => string): string {
  const pinned = process.env.PI_CODING_AGENT_DIR
  return pinned === undefined || pinned === '' ? fallback() : pinned
}

/**
 * The per-cwd session directory: the resolved cwd has its leading separator
 * dropped and every `/ \ :` turned into `-`, wrapped in `--…--` under
 * `<agentDir>/sessions`. This keeps standalone sessions landing where Pi's own
 * CLI looks for them.
 * @param cwd - resolved working directory of the delegated task.
 * @param agentDir - resolved Pi global config home.
 * @returns the directory holding this cwd's session files.
 */
export function resolveSessionDir(cwd: string, agentDir: string): string {
  const slug = resolve(cwd).replace(/^[/\\]/u, '').replaceAll(/[/\\:]/gu, '-')
  return join(resolve(agentDir), 'sessions', `--${slug}--`)
}
