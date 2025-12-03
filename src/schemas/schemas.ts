/**
 * Re-export JSON schemas for external use
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for schema files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemasDir = __dirname;

// Load and export schemas
export const MANIFEST_SCHEMA = JSON.parse(
  readFileSync(join(schemasDir, 'manifest.json'), 'utf8')
);
export const PARTIAL_SCHEMA = JSON.parse(
  readFileSync(join(schemasDir, 'partial.json'), 'utf8')
);
export const PACKAGE_SCHEMA = JSON.parse(
  readFileSync(join(schemasDir, 'policy-package.schema.json'), 'utf8')
);

/**
 * Schema URLs for external reference
 */
export const SCHEMA_URLS = {
  manifest: 'https://ai-policies.dev/schemas/manifest.json',
  partial: 'https://ai-policies.dev/schemas/partial.json',
  package: 'https://ai-policies.dev/schemas/package.json',
} as const;

/**
 * Get schema by name
 */
export function getSchema(name: 'manifest' | 'partial' | 'package') {
  switch (name) {
    case 'manifest':
      return MANIFEST_SCHEMA;
    case 'partial':
      return PARTIAL_SCHEMA;
    case 'package':
      return PACKAGE_SCHEMA;
    default:
      throw new Error(`Unknown schema: ${name}`);
  }
}

/**
 * Get all schemas
 */
export function getAllSchemas() {
  return {
    manifest: MANIFEST_SCHEMA,
    partial: PARTIAL_SCHEMA,
    package: PACKAGE_SCHEMA,
  };
}
