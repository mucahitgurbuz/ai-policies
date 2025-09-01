import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/examples/**',
      ],
    },
    include: ['packages/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build'],
  },
  resolve: {
    alias: {
      '@ai-policies/cli': resolve(__dirname, './packages/cli/src'),
      '@ai-policies/core-schemas': resolve(__dirname, './packages/core-schemas/src'),
      '@ai-policies/compose-engine': resolve(__dirname, './packages/compose-engine/src'),
      '@ai-policies/provider-cursor': resolve(__dirname, './packages/providers/provider-cursor/src'),
      '@ai-policies/provider-copilot': resolve(__dirname, './packages/providers/provider-copilot/src'),
      '@ai-policies/policy-registry': resolve(__dirname, './packages/policy-registry/src'),
      '@ai-policies/update-bot-action': resolve(__dirname, './packages/update-bot-action/src'),
    },
  },
});
