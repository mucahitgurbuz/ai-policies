import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import type {
  ManifestConfig,
  PartialFrontmatter,
  PolicyPackageConfig,
  ValidationResult,
  ValidationError,
} from './types.js';

// Get current directory for schema files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemasDir = join(__dirname, '..', 'schemas');

// Load JSON schemas
const manifestSchema = JSON.parse(
  readFileSync(join(schemasDir, 'manifest.json'), 'utf8')
);
const partialSchema = JSON.parse(
  readFileSync(join(schemasDir, 'partial.json'), 'utf8')
);
const packageSchema = JSON.parse(
  readFileSync(join(schemasDir, 'package.json'), 'utf8')
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
    // Additional semantic validation
    const partial = data as PartialFrontmatter;
    const errors = performSemanticPartialValidation(partial);

    return {
      valid: errors.length === 0,
      errors,
    };
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

  // Check that compose.order contains valid layers
  const validLayers: Set<string> = new Set(['core', 'domain', 'stack', 'team']);
  for (const layer of manifest.compose.order) {
    if (!validLayers.has(layer)) {
      errors.push({
        message: `Invalid layer in compose.order: '${layer}'. Valid layers: ${Array.from(validLayers).join(', ')}`,
        path: 'compose.order',
        value: layer,
      });
    }
  }

  // Check that protectedLayers are in compose.order
  for (const layer of manifest.compose.protectedLayers) {
    if (!manifest.compose.order.includes(layer)) {
      errors.push({
        message: `Protected layer '${layer}' must be included in compose.order`,
        path: 'compose.protectedLayers',
        value: layer,
      });
    }
  }

  // Validate package names format
  for (const packageName of Object.keys(manifest.requires)) {
    if (!packageName.startsWith('@') || !packageName.includes('/')) {
      errors.push({
        message: `Invalid package name format: '${packageName}'. Expected format: @scope/name`,
        path: `requires.${packageName}`,
        value: packageName,
      });
    }
  }

  return errors;
}

/**
 * Perform additional semantic validation for partial frontmatter
 */
function performSemanticPartialValidation(
  partial: PartialFrontmatter
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for self-dependencies
  if (partial.dependsOn.includes(partial.id)) {
    errors.push({
      message: `Partial '${partial.id}' cannot depend on itself`,
      path: 'dependsOn',
      value: partial.id,
    });
  }

  // Check weight bounds for specific layers
  if (partial.layer === 'core' && partial.weight > 100) {
    errors.push({
      message:
        'Core layer partials should have weight <= 100 to maintain priority',
      path: 'weight',
      value: partial.weight,
    });
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
