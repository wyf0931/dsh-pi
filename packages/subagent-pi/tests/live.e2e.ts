/**
 * Live Pi delegation through the registered provider, using the machine's
 * configured Pi authentication. Opt in with DSH_PI_E2E=1; without it the file
 * self-skips so a credential-free CI run stays green.
 */

import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { SubagentRuntime } from '@deepseek-ai/dsh-subagent'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import { externalTestParent } from './support/external-test-parent.ts'
import { expect, it } from 'vitest'
import * as piProvider from '../src/index.ts'
import { mountWorkingDirectoryFixture } from './support/working-directory-fixture.ts'

it.skipIf(process.env.DSH_PI_E2E !== '1')(
  'delegates a file task to the installed Pi through the registered provider',
  { timeout: 180_000, retry: 0 },
  async (test) => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-pi-live-'))
    const ctx = new Context()
    test.onTestFinished(async () => {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    })
    const nonce = `${randomUUID()}\n`
    await writeFile(join(root, 'input.txt'), nonce)
    await ctx.plugin(SessionProjectionRegistry)
    await mountWorkingDirectoryFixture(ctx)
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(piProvider, {
      providerName: 'pi-live',
      timeoutMs: 120_000,
      ...(process.env.DSH_PI_E2E_MODEL === undefined ? {} : { model: process.env.DSH_PI_E2E_MODEL }),
    })
    const parent = await externalTestParent(ctx, root)
    const provider = ctx.subagents.getProvider('pi-live')
    expect(provider).toBeDefined()
    const run = await provider?.start!({
      parent,
      cwd: root,
      signal: test.signal,
      prompt: [{ type: 'text', text: 'Read input.txt and create output.txt with exactly the same bytes. Only change output.txt. Do not use git or install software. Reply PI_NATIVE_OK when finished.' }],
    })
    expect(run).toBeDefined()
    const result = await run!.result
    await run!.dispose()
    expect(result.stopReason, result.diagnostic).toBe('completed')
    expect(await readFile(join(root, 'output.txt'), 'utf8')).toBe(nonce)
    expect(result.output.filter(block => block.type === 'text').map(block => block.text).join('')).toContain('PI_NATIVE_OK')
  },
)
