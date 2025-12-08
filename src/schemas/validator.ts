import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import type {
  ManifestConfig,
  ValidationResult,
  ValidationError,
} from './types.js';
import { isLocalPath, isValidPackageName } from './utils.js';

// Get current directory for schema files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemasDir = __dirname;

// Load JSON schemas
const manifestSchema = JSON.parse(
  readFileSync(join(schemasDir, 'manifest.json'), 'utf8')
);
const partialSchema = JSON.parse(
  readFileSync(join(schemasDir, 'partial.json'), 'utf8')
);
const packageSchema = JSON.parse(
  readFileSync(join(schemasDir, 'policy-package.schema.json'), 'utf8')
);

// Create AJV instance with formats support
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
});
addFormats(ajv);

// Compile schemas
const validateManifest = ajv.compile(manifestSchema);
const validatePartial = ajv.compile(partialSchema);
const validatePackage = ajv.compile(packageSchema);

/**
 * Validate a manifest configuration
 */
export function validateManifestConfig(data: unknown): ValidationResult {
  const valid = validateManifest(data);

  if (valid) {
    // Additional semantic validation
    const manifest = data as ManifestConfig;
    const errors = performSemanticManifestValidation(manifest);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  return {
    valid: false,
    errors: convertAjvErrors(validateManifest.errors || []),
  };
}

/**
 * Validate partial frontmatter
 */
export function validatePartialFrontmatter(data: unknown): ValidationResult {
  const valid = validatePartial(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: convertAjvErrors(validatePartial.errors || []),
  };
}

/**
 * Validate package configuration
 */
export function validatePackageConfig(data: unknown): ValidationResult {
  const valid = validatePackage(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: convertAjvErrors(validatePackage.errors || []),
  };
}

/**
 * Perform additional semantic validation for manifest
 */
function performSemanticManifestValidation(
  manifest: ManifestConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check that at least one output is specified
  if (!manifest.output.cursor && !manifest.output.copilot) {
    errors.push({
      message:
        'At least one output target (cursor or copilot) must be specified',
      path: 'output',
    });
  }

  // Validate extends entries (npm packages or local paths)
  for (let i = 0; i < manifest.extends.length; i++) {
    const entry = manifest.extends[i];

    if (!isLocalPath(entry) && !isValidPackageName(entry)) {
      // Allow non-scoped npm packages too
      const simplePackageRegex = /^[a-z0-9-]+$/;
      if (!simplePackageRegex.test(entry)) {
        errors.push({
          message: `Invalid extends entry: '${entry}'. Must be an npm package name or local path (starting with ./ or /)`,
          path: `extends[${i}]`,
          value: entry,
        });
      }
    }
  }

  // Check for duplicate extends entries
  const seen = new Set<string>();
  for (const entry of manifest.extends) {
    if (seen.has(entry)) {
      errors.push({
        message: `Duplicate extends entry: '${entry}'`,
        path: 'extends',
        value: entry,
      });
    }
    seen.add(entry);
  }

  // Check for duplicate protected entries
  if (manifest.protected) {
    const protectedSeen = new Set<string>();
    for (const id of manifest.protected) {
      if (protectedSeen.has(id)) {
        errors.push({
          message: `Duplicate protected entry: '${id}'`,
          path: 'protected',
          value: id,
        });
      }
      protectedSeen.add(id);
    }
  }

  // Check for duplicate exclude entries
  if (manifest.exclude) {
    const excludeSeen = new Set<string>();
    for (const id of manifest.exclude) {
      if (excludeSeen.has(id)) {
        errors.push({
          message: `Duplicate exclude entry: '${id}'`,
          path: 'exclude',
          value: id,
        });
      }
      excludeSeen.add(id);
    }
  }

  return errors;
}

/**
 * Convert AJV errors to our ValidationError format
 */
function convertAjvErrors(ajvErrors: any[]): ValidationError[] {
  return ajvErrors.map(error => ({
    message: error.message || 'Validation error',
    path: error.instancePath || error.dataPath || '',
    keyword: error.keyword,
    value: error.data,
  }));
}

/**
 * Create a validation function for a custom schema
 */
export function createValidator(schema: object) {
  const validate = ajv.compile(schema);

  return (data: unknown): ValidationResult => {
    const valid = validate(data);

    return {
      valid,
      errors: valid ? [] : convertAjvErrors(validate.errors || []),
    };
  };
}

/**
 * Get the raw JSON schemas
 */
export function getSchemas() {
  return {
    manifest: manifestSchema,
    partial: partialSchema,
    package: packageSchema,
  };
}
