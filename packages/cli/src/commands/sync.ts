import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { getPartials } from '@ai-policies/policy-registry';
import { composePartials } from '@ai-policies/compose-engine';
import type { Provider } from '@ai-policies/core-schemas';
import { generateMetadataHeader } from '@ai-policies/core-schemas';

interface SyncOptions {
  dry?: boolean;
  verbose?: boolean;
}

export const syncCommand: CommandModule<{}, SyncOptions> = {
  command: 'sync',
  describe: 'Sync AI policies and generate IDE configuration files',
  builder: {
    dry: {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be generated without writing files',
      default: false,
    },
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Show detailed output',
      default: false,
    },
  },
  handler: async (argv) => {
    try {
      logger.debug = argv.verbose ? logger.debug.bind(logger) : () => {};

      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error('No .ai-policies.yaml found. Run "ai-policies init" first.');
        process.exit(1);
      }

      const config = await loadManifest(manifestPath);
      const projectRoot = path.dirname(manifestPath);

      logger.info('Loading policy packages...');

      // Load partials from required packages
      let partials;
      try {
        partials = await getPartials(config.requires);
        logger.info(\`Loaded \${partials.length} policy partials from \${Object.keys(config.requires).length} packages\`);

        if (partials.length === 0) {
          logger.warn('No policy partials found. Check your package requirements.');
        }
      } catch (error) {
        logger.error(\`Failed to load policy packages: \${error instanceof Error ? error.message : String(error)}\`);
        throw error;
      }

      // Generate Cursor rules
      if (config.output.cursor) {
        await generateOutput(
          'cursor',
          config,
          partials,
          projectRoot,
          config.output.cursor,
          argv.dry,
          argv.verbose
        );
      }

      // Generate Copilot instructions
      if (config.output.copilot) {
        await generateOutput(
          'copilot',
          config,
          partials,
          projectRoot,
          config.output.copilot,
          argv.dry,
          argv.verbose
        );
      }

      if (!argv.dry) {
        logger.info('');
        logger.success('Sync completed successfully!');
        logger.info('Your AI IDE configurations are now up to date.');
      }
    } catch (error) {
      logger.error(\`Failed to sync: \${error instanceof Error ? error.message : String(error)}\`);
      process.exit(1);
    }
  },
};

async function generateOutput(
  provider: Provider,
  config: Awaited<ReturnType<typeof loadManifest>>,
  partials: Awaited<ReturnType<typeof getPartials>>,
  projectRoot: string,
  outputPath: string,
  dry: boolean,
  verbose: boolean
): Promise<void> {
  try {
    logger.info(\`Composing policies for \${provider}...\`);

    // Compose partials
    const result = await composePartials(
      partials,
      config,
      provider,
      {
        teamAppendContent: config.overrides?.teamAppendContent,
        excludePartials: config.overrides?.excludePartials,
        debug: verbose,
      }
    );

    const fullPath = path.resolve(projectRoot, outputPath);

    if (dry) {
      logger.info(\`Would write \${provider} output to: \${path.relative(process.cwd(), fullPath)}\`);
      if (verbose) {
        logger.debug('Content preview:');
        logger.debug(result.content.split('\n').slice(0, 20).join('\n') + '...');
      }
    } else {
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, result.content, 'utf8');
      logger.success(\`Generated \${path.relative(projectRoot, fullPath)}\`);
      
      if (verbose) {
        logger.debug(\`Included \${result.metadata.partials.length} partials\`);
        logger.debug(\`Content hash: \${result.metadata.contentHash}\`);
      }
    }
  } catch (error) {
    logger.error(\`Failed to generate \${provider} output: \${error instanceof Error ? error.message : String(error)}\`);
    throw error;
  }
}
