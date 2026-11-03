import { afterEach, describe, expect, it } from 'vitest'
import { resolveAgentDir, resolveSessionDir } from '../src/environment.ts'

afterEach(() => {
  delete process.env.PI_CODING_AGENT_DIR
})

describe('resolveAgentDir', () => {
  it('uses the fallback when the env var is absent', () => {
    expect(resolveAgentDir(() => '/default/dir')).toBe('/default/dir')
  })

  it('uses the env var when set', () => {
    process.env.PI_CODING_AGENT_DIR = '/pinned/dir'
    expect(resolveAgentDir(() => '/default/dir')).toBe('/pinned/dir')
  })

  it('treats an empty env var as unset', () => {
    process.env.PI_CODING_AGENT_DIR = ''
    expect(resolveAgentDir(() => '/default/dir')).toBe('/default/dir')
  })
})

describe('resolveSessionDir', () => {
  it('builds the encoded per-cwd directory under the agent home sessions', () => {
    const dir = resolveSessionDir('/Users/scott/project', '/home/pi')
    expect(dir.replaceAll('\\\\', '/')).toBe('/home/pi/sessions/--Users-scott-project--')
  })

  it('encodes every path separator into a dash', () => {
    const dir = resolveSessionDir('/work/repo', '/home/pi')
    expect(dir).toBe('/home/pi/sessions/--work-repo--')
  })
})
