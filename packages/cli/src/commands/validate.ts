import type { CommandModule } from 'yargs';
import path from 'path';
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
  handler: async (argv) => {
    try {
      logger.info('🔍 Validating AI Policies configuration...\n');

      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error('No .ai-policies.yaml found. Run "ai-policies init" first.');
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
        logger.error(\`❌ Found \${errors.length} validation error(s):\n\`);

        for (const error of errors) {
          logger.error(\`  • \${error}\`);
        }

        process.exit(1);
      }
    } catch (error) {
      logger.error(\`Validation failed: \${error instanceof Error ? error.message : String(error)}\`);
      process.exit(1);
    }
  },
};

// Define the manifest schema using Zod
const ManifestSchema = z.object({
  requires: z.record(z.string()),
  output: z.object({
    cursor: z.string().optional(),
    copilot: z.string().optional(),
  }),
  compose: z.object({
    order: z.array(z.string()),
    protectedLayers: z.array(z.string()),
    teamAppend: z.boolean(),
  }),
});

const PartialFrontmatterSchema = z.object({
  id: z.string(),
  layer: z.enum(['core', 'domain', 'stack', 'team']),
  weight: z.number(),
  protected: z.boolean(),
  dependsOn: z.array(z.string()),
  owner: z.string(),
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
        errors.push(\`Manifest schema error at '\${path}': \${issue.message}\`);
      }
    } else {
      // Additional semantic validation
      const manifest = result.data;

      // Check that output has at least one target
      if (!manifest.output.cursor && !manifest.output.copilot) {
        errors.push('At least one output target (cursor or copilot) must be specified');
      }

      // Check that compose.order contains valid layers
      const validLayers = ['core', 'domain', 'stack', 'team'];
      for (const layer of manifest.compose.order) {
        if (!validLayers.includes(layer)) {
          errors.push(\`Invalid layer in compose.order: '\${layer}'. Valid layers: \${validLayers.join(', ')}\`);
        }
      }

      // Check that protectedLayers are in compose.order
      for (const layer of manifest.compose.protectedLayers) {
        if (!manifest.compose.order.includes(layer)) {
          errors.push(\`Protected layer '\${layer}' must be included in compose.order\`);
        }
      }

      // Validate package names format
      for (const packageName of Object.keys(manifest.requires)) {
        if (!packageName.startsWith('@') || !packageName.includes('/')) {
          errors.push(\`Invalid package name format: '\${packageName}'. Expected format: @scope/name\`);
        }
      }
    }
  } catch (yamlError) {
    errors.push(\`Invalid YAML syntax: \${yamlError instanceof Error ? yamlError.message : String(yamlError)}\`);
  }

  return errors;
}

async function validatePolicyPartials(): Promise<string[]> {
  const errors: string[] = [];

  // Placeholder implementation
  // In a real implementation, this would:
  // 1. Find all partial files in the policy packages
  // 2. Parse the frontmatter and validate against schema
  // 3. Check for duplicate IDs
  // 4. Validate dependsOn references
  // 5. Check for circular dependencies

  logger.info('Policy partials validation (placeholder - no partials found)');

  return errors;
}

// Export schemas for use in other packages
export { ManifestSchema, PartialFrontmatterSchema };
