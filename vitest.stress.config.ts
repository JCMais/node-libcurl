import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/stress/**/*.spec.ts'],
    // No globalSetup — the stress test brings its own minimal HTTP server.
    testTimeout: 120_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--expose-gc'],
      },
    },
  },
})
