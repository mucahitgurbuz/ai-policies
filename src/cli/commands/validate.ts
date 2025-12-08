import type { CommandModule } from 'yargs';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { z } from 'zod';

import { findManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface ValidateOptions {
  schema?: boolean;
  partials?: boolean;
}

export const validateCommand: CommandModule<{}, ValidateOptions> = {
  command: 'validate',
  describe: 'Validate configuration files and policy partials',
  builder: {
    schema: {
      alias: 's',
      type: 'boolean',
      description: 'Validate only schema compliance',
      default: false,
    },
    partials: {
      alias: 'p',
      type: 'boolean',
      description: 'Validate policy partials format',
      default: false,
    },
  },
  handler: async argv => {
    try {
      logger.info('🔍 Validating AI Policies configuration...\n');

      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error(
          'No .ai-policies.yaml found. Run "ai-policies init" first.'
        );
        process.exit(1);
      }

      const errors: string[] = [];

      // Validate manifest schema
      if (!argv.partials || argv.schema) {
        const manifestErrors = await validateManifestSchema(manifestPath);
        errors.push(...manifestErrors);
      }

      // Validate policy partials (placeholder - would validate actual partials)
      if (argv.partials) {
        const partialErrors = await validatePolicyPartials();
        errors.push(...partialErrors);
      }

      if (errors.length === 0) {
        logger.success('✅ All validation checks passed!');
      } else {
        logger.error(`❌ Found ${errors.length} validation error(s):\n`);

        for (const error of errors) {
          logger.error(`  • ${error}`);
        }

        process.exit(1);
      }
    } catch (error) {
      logger.error(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};

// Define the manifest schema using Zod (v2.0 format)
const ManifestSchema = z.object({
  extends: z.array(z.string()).min(1),
  output: z.object({
    cursor: z.string().optional(),
    copilot: z.string().optional(),
  }),
  protected: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

const PartialFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  owner: z.string().max(100).optional(),
  tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).optional(),
  providers: z.array(z.enum(['cursor', 'copilot'])).optional(),
});

async function validateManifestSchema(manifestPath: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const data = yaml.load(content);

    const result = ManifestSchema.safeParse(data);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors.push(`Manifest schema error at '${path}': ${issue.message}`);
      }
    } else {
      // Additional semantic validation
      const manifest = result.data;

      // Check that output has at least one target
      if (!manifest.output.cursor && !manifest.output.copilot) {
        errors.push(
          'At least one output target (cursor or copilot) must be specified'
        );
      }

      // Validate extends entries (package names or local paths)
      for (const entry of manifest.extends) {
        const isLocalPath = entry.startsWith('./') || entry.startsWith('/');
        const isScopedPackage = entry.startsWith('@') && entry.includes('/');
        const isUnscopedPackage =
          !entry.startsWith('@') &&
          !entry.startsWith('./') &&
          !entry.startsWith('/');

        if (!isLocalPath && !isScopedPackage && !isUnscopedPackage) {
          errors.push(
            `Invalid extends entry: '${entry}'. Expected npm package name or local path (starting with ./ or /)`
          );
        }
      }

      // Validate protected partial IDs format
      if (manifest.protected) {
        for (const partialId of manifest.protected) {
          if (!/^[a-z0-9-]+$/.test(partialId)) {
            errors.push(
              `Invalid protected partial ID: '${partialId}'. Must be lowercase alphanumeric with hyphens.`
            );
          }
        }
      }

      // Validate exclude partial IDs format
      if (manifest.exclude) {
        for (const partialId of manifest.exclude) {
          if (!/^[a-z0-9-]+$/.test(partialId)) {
            errors.push(
              `Invalid exclude partial ID: '${partialId}'. Must be lowercase alphanumeric with hyphens.`
            );
          }
        }
      }
    }
  } catch (yamlError) {
    errors.push(
      `Invalid YAML syntax: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`
    );
  }

  return errors;
}

async function validatePolicyPartials(): Promise<string[]> {
  const errors: string[] = [];

  // Placeholder implementation
  // In a real implementation, this would:
  // 1. Find all partial files in the resolved policy packages
  // 2. Parse the frontmatter and validate against PartialFrontmatterSchema
  // 3. Check for duplicate IDs across packages
  // 4. Validate that providers array only contains valid values

  logger.info('Policy partials validation (placeholder - no partials found)');

  return errors;
}

// Export schemas for use in other packages
export { ManifestSchema, PartialFrontmatterSchema };
