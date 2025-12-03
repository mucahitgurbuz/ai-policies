/**
 * AI Policies - Centralized AI IDE rules management
 *
 * This is the main entry point for the library.
 * For CLI usage, see src/cli/index.ts
 */

// Schema types and validation
export * from './schemas/types.js';
export * from './schemas/validator.js';
export * from './schemas/utils.js';

// Composition engine
export * from './compose/composer.js';
export * from './compose/merger.js';
export * from './compose/resolver.js';

// Providers
export { CursorProvider } from './providers/cursor-provider.js';
export { CopilotProvider } from './providers/copilot-provider.js';

// Policy registry
export { PolicyRegistry, getPartials } from './policies/registry.js';
