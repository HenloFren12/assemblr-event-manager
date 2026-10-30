// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['shared/**/*.test.ts', 'api/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    coverage: { provider: 'v8', include: ['shared/**', 'api/**', 'src/**'], exclude: ['**/*.test.*', '**/testUtils.ts'] },
  },
});
