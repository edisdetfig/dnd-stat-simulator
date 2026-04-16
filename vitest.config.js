import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'bench/**/*.test.js'],
    globals: false,
    benchmark: {
      include: ['bench/**/*.bench.js'],
    },
  },
});
