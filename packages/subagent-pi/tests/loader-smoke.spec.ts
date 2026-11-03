import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

it('exposes only the provider plugin surface and loads as a function plugin', () => {
  expect('default' in plugin).toBe(false)
  expect(Object.keys(plugin).sort()).toEqual(['Config', 'apply', 'inject', 'name'])
  expect(plugin.name).toBe('subagent-pi')
  expect(plugin.inject).toEqual(['subagents'])
  const loader = new Loader(new Context())
  expect(loader.unwrapExports(plugin)).toBe(plugin)
})
