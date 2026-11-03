import { existsSync, globSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'tsdown'

/**
 * Bundle each package's tsc-emitted Host JavaScript (lib/types) into one ESM
 * runtime artifact per package (lib). Runtime dependencies such as the Pi SDK
 * stay external and are resolved from node_modules at runtime. Packages
 * without a TypeScript source entry, such as the plain-JavaScript bundle, are
 * not part of the runtime build.
 */
export default defineConfig(() => {
  const packages = globSync(['packages/*/package.json'])
    .map(file => file.replace('/package.json', ''))
    .filter(dir => dir.startsWith('packages/') && existsSync(join(dir, 'src', 'index.ts')))
  return {
    workspace: packages,
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  }
})
