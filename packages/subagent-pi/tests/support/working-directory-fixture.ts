import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'

/** Minimal directory service whose paths are symbolic and deterministic. */
class FixtureWorkingDirectory extends Service {
  private readonly directories = new WeakMap<Session, string>()

  constructor(ctx: Context) {
    super(ctx, 'workingDirectory')
  }

  get(session: Session): string {
    return this.directories.get(session) ?? session?.header.cwd ?? process.cwd()
  }

  async ensure(agent: Agent, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    return this.get(agent.session)
  }

  async set(agent: Agent, path: string, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted()
    const { resolve } = await import('node:path')
    const cwd = resolve(this.get(agent.session), path)
    this.directories.set(agent.session, cwd)
    return cwd
  }
}

export async function mountWorkingDirectoryFixture(ctx: Context): Promise<void> {
  if (ctx.get('workingDirectory') === undefined) await ctx.plugin(FixtureWorkingDirectory)
}
