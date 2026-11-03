/**
 * A registered parent Agent with a real Session and an observable, non-driving
 * Inbox, for provider tests that start an external activation directly.
 *
 * @module support/external-test-parent
 */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import { unsupportedModel, createInboxStub } from '@deepseek-ai/dsh-agent-loop-testkit'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { onTestFinished } from 'vitest'

/** Mount only the registries an external child's parent needs; no model is driven. */
export async function externalTestParent(ctx: Context, cwd?: string): Promise<Agent> {
  if (ctx.get('sessionProjections') === undefined) await ctx.plugin(SessionProjectionRegistry)
  if (ctx.get('sessions') === undefined) await ctx.plugin(SessionStore)
  if (ctx.get('agents') === undefined) await ctx.plugin(AgentRegistry)
  onTestFinished(() => ctx.fiber.dispose())
  const session = ctx.sessions.create(SessionId(randomUUID()), {
    meta: cwd === undefined ? {} : { cwd },
  })
  const inbox = createInboxStub()
  const parent: Agent = {
    id: session.id,
    session,
    ctx,
    options: {},
    status: 'idle',
    model: unsupportedModel(),
    inbox,
    send: (message, target) => { inbox.append(target, message) },
    followup: (message) => { inbox.append('next-turn', message) },
    steer: (message) => { inbox.append('next-step', message) },
    inject: (message) => { inbox.append('next-step', message) },
    cancel: (_cause, options) => { if (!options?.keepInbox) inbox.clear() },
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(parent as never)
  return parent
}
