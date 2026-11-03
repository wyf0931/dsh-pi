import { globSync } from 'node:fs'
import { defineConfig } from 'tsdown'

/**
 * Bundle each package's tsc-emitted Host JavaScript (lib/types) into one ESM
 * runtime artifact per package (lib). Runtime dependencies such as the Pi SDK
 * stay external and are resolved from node_modules at runtime.
 */
export default defineConfig(() => {
  const packages = globSync(['packages/*/package.json'])
    .map(file => file.replace('/package.json', ''))
    .filter(dir => dir.startsWith('packages/'))
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
