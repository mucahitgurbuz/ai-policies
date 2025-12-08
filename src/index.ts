/**
 * AI Policies v2.0 - Centralized AI IDE rules management
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
export * from './compose/utils.js';
export * from './compose/types.js';

// Package resolution
export * from './packages/resolver.js';

// Providers
export { renderCursorRules } from './providers/cursor-provider.js';
export { renderCopilotInstructions } from './providers/copilot-provider.js';
