/**
 * The installable bundle must stay a valid DSH bundle: a patch declaration,
 * resolvable plugin entries, display resources for each row, and a client half
 * that registers the provider's configuration page.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as provider from '../subagent.js'
import * as tool from '../tool.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dsh?: {
    bundle?: { patch?: string }
    client?: { platform?: string; immediately?: boolean; inject?: string[] }
  }
  exports?: Record<string, string | { types?: string; default?: string }>
  files?: string[]
}

function meta(row: string): { title: string; description: string } {
  const en = JSON.parse(readFileSync(join(root, row, 'locale', 'en.json'), 'utf8')) as {
    meta?: { title?: string; description?: string }
  }
  const zh = JSON.parse(readFileSync(join(root, row, 'locale', 'zh.json'), 'utf8')) as {
    meta?: { title?: string; description?: string }
  }
  expect(en.meta?.title?.length).toBeGreaterThan(0)
  expect(en.meta?.description?.length).toBeGreaterThan(0)
  expect(zh.meta?.title?.length).toBeGreaterThan(0)
  expect(zh.meta?.description?.length).toBeGreaterThan(0)
  return { title: en.meta!.title!, description: en.meta!.description! }
}

describe('dsh-pi bundle', () => {
  it('declares a bundle patch and ships it', () => {
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.files).toContain('cordis.patch.yml')
    expect(() => readFileSync(join(root, 'cordis.patch.yml'), 'utf8')).not.toThrow()
  })

  it('inserts the provider under the bare bundle name and the tool as a subpath', () => {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    expect(patch).toContain('id: subagent-pi')
    expect(patch).toContain('name: dsh-pi\n')
    expect(patch).toContain('id: tool-subagent-pi')
    expect(patch).toContain('name: dsh-pi/tool')
    expect(manifest.exports?.['.']).toMatchObject({ default: './subagent.js' })
    expect(manifest.exports?.['./subagent']).toMatchObject({ default: './subagent.js' })
    expect(manifest.exports?.['./tool']).toMatchObject({ default: './tool.js' })
  })

  it('ships a web client half that the plugin manager boot graph can load', () => {
    expect(manifest.dsh?.client).toMatchObject({
      platform: 'web',
      immediately: true,
    })
    expect(manifest.dsh?.client?.inject).toContain('@deepseek-ai/dsh-client-ui-plugin-manager')
    expect(manifest.exports?.['./client']).toBe('./client.js')
    expect(manifest.files).toContain('client.js')
    const client = readFileSync(join(root, 'client.js'), 'utf8')
    expect(client).toContain("id: 'dsh-pi'")
    expect(client).toContain("plugins.row.config")
    expect(client).toContain('dsh-pi#subagent-pi')
    expect(client).toContain('form.mutate')
  })

  it('re-exports the provider plugin surface', () => {
    expect(provider.name).toBe('subagent-pi')
    expect(provider.inject).toEqual(['subagents'])
    expect(typeof provider.apply).toBe('function')
  })

  it('re-exports the tool plugin surface', () => {
    expect(tool.name).toBe('tool-subagent-pi')
    expect(tool.inject).toEqual(['tools', 'subagents'])
    expect(typeof tool.apply).toBe('function')
  })

  it('gives the provider row root metadata and the tool row its own', () => {
    const providerMeta = meta('')
    const toolMeta = meta('tool')
    expect(providerMeta.title).not.toBe(toolMeta.title)
    expect(manifest.exports?.['./locale/*.json']).toBe('./locale/*.json')
    expect(manifest.exports?.['./icon']).toBe('./icon.svg')
    expect(manifest.exports?.['./tool/locale/*.json']).toBe('./tool/locale/*.json')
    expect(manifest.exports?.['./tool/icon']).toBe('./tool/icon.svg')
    expect(readFileSync(join(root, 'icon.svg'), 'utf8')).toContain('<svg')
    expect(readFileSync(join(root, 'tool', 'icon.svg'), 'utf8')).toContain('<svg')
  })

  it('keeps the subagent subpath resources for existing composition rows', () => {
    expect(readFileSync(join(root, 'subagent', 'icon.svg'), 'utf8')).toContain('<svg')
    expect(manifest.exports?.['./subagent/icon']).toBe('./subagent/icon.svg')
  })
})
