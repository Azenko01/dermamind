import { defineConfig } from 'vitest/config';

export default defineConfig({
  // use @dermamind/scoring sources, not a possibly stale dist
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: { include: ['**/*.test.ts'], exclude: ['node_modules/**'] },
});
