/**
 * The installable bundle must stay a valid DSH bundle: a patch declaration,
 * resolvable subpath plugin entries, and display resources for each row.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as subagent from '../subagent.js'
import * as tool from '../tool.js'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dsh?: { bundle?: { patch?: string } }
  exports?: Record<string, string | { types?: string; default?: string }>
  files?: string[]
}

describe('dsh-pi bundle', () => {
  it('declares a bundle patch and ships it', () => {
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.files).toContain('cordis.patch.yml')
    expect(() => readFileSync(join(root, 'cordis.patch.yml'), 'utf8')).not.toThrow()
  })

  it('inserts both plugin rows pointing at resolvable subpaths', () => {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    expect(patch).toContain('id: subagent-pi')
    expect(patch).toContain('name: dsh-pi/subagent')
    expect(patch).toContain('id: tool-subagent-pi')
    expect(patch).toContain('name: dsh-pi/tool')
    expect(manifest.exports?.['./subagent']).toMatchObject({ default: './subagent.js' })
    expect(manifest.exports?.['./tool']).toMatchObject({ default: './tool.js' })
  })

  it('re-exports the provider plugin surface', () => {
    expect(subagent.name).toBe('subagent-pi')
    expect(subagent.inject).toEqual(['subagents'])
    expect(typeof subagent.apply).toBe('function')
  })

  it('re-exports the tool plugin surface', () => {
    expect(tool.name).toBe('tool-subagent-pi')
    expect(tool.inject).toEqual(['tools', 'subagents'])
    expect(typeof tool.apply).toBe('function')
  })

  it('gives each row its own locale metadata and icon export', () => {
    for (const row of ['subagent', 'tool'] as const) {
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
      expect(manifest.exports?.[`./${row}/locale/*.json`]).toBe(`./${row}/locale/*.json`)
      expect(manifest.exports?.[`./${row}/icon`]).toBe(`./${row}/icon.svg`)
      expect(readFileSync(join(root, row, 'icon.svg'), 'utf8')).toContain('<svg')
    }
  })
})
