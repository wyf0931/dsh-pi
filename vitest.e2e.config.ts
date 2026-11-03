import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.e2e.ts'],
    environment: 'node',
    testTimeout: 300_000,
    retry: 0,
  },
})
