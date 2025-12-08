import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

import { findManifest, saveManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { ManifestConfig } from '../../schemas/types.js';

interface MigrateOptions {
  dry?: boolean;
  skipInstall?: boolean;
}

// v1.x config format
interface V1ManifestConfig {
  extends: Record<string, string>;
  output: {
    cursor?: string;
    copilot?: string;
  };
  compose: {
    order: string[];
    protectedLayers: string[];
    teamAppend: boolean;
  };
  overrides?: {
    teamAppendContent?: string;
    excludePartials?: string[];
  };
}

export const migrateCommand: CommandModule<{}, MigrateOptions> = {
  command: 'migrate',
  describe: 'Migrate legacy v1.x configuration to current format',
  builder: {
    dry: {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be changed without writing files',
      default: false,
    },
    'skip-install': {
      type: 'boolean',
      description: 'Skip npm install step',
      default: false,
    },
  },
  handler: async argv => {
    try {
      const manifestPath = await findManifest();
      if (!manifestPath) {
        logger.error('No .ai-policies.yaml found. Nothing to migrate.');
        process.exit(1);
      }

      const projectRoot = path.dirname(manifestPath);

      // Read the raw config file
      const rawContent = await fs.readFile(manifestPath, 'utf8');
      const rawConfig = yaml.load(rawContent) as any;

      // Check if already current format (extends is array)
      if (Array.isArray(rawConfig.extends)) {
        logger.info(
          'Configuration is already in current format. Nothing to migrate.'
        );
        return;
      }

      // Validate v1 format
      if (!rawConfig.extends || typeof rawConfig.extends !== 'object') {
        logger.error(
          'Invalid configuration format. Expected v1.x extends object.'
        );
        process.exit(1);
      }

      const v1Config = rawConfig as V1ManifestConfig;
      logger.info('Detected v1.x configuration format');
      logger.info('');

      // Convert to current format
      const newConfig: ManifestConfig = {
        extends: Object.keys(v1Config.extends),
        output: v1Config.output,
      };

      // Handle protected partials
      // In v1, protectedLayers protected all partials in that layer
      // Now we need to explicitly list partial IDs
      // We'll add a comment about this and use core-safety as a sensible default
      const protectedPartials: string[] = [];
      if (v1Config.compose?.protectedLayers?.includes('core')) {
        protectedPartials.push('core-safety');
      }

      if (protectedPartials.length > 0) {
        newConfig.protected = protectedPartials;
      }

      // Handle excludePartials from overrides
      if (v1Config.overrides?.excludePartials?.length) {
        newConfig.exclude = v1Config.overrides.excludePartials;
      }

      // Log changes
      logger.info('Migration changes:');
      logger.info('');

      logger.info('1. extends: object -> array');
      logger.info(`   Before: ${JSON.stringify(v1Config.extends)}`);
      logger.info(`   After:  ${JSON.stringify(newConfig.extends)}`);
      logger.info('');

      logger.info('2. compose section: REMOVED');
      logger.info(
        '   - Layer ordering is now determined by extends array order'
      );
      logger.info('   - Weights are no longer used');
      logger.info('');

      if (protectedPartials.length > 0) {
        logger.info('3. protected: Added from protectedLayers');
        logger.info(`   Value: ${JSON.stringify(protectedPartials)}`);
        logger.info('');
      }

      if (newConfig.exclude?.length) {
        logger.info('4. exclude: Migrated from overrides.excludePartials');
        logger.info(`   Value: ${JSON.stringify(newConfig.exclude)}`);
        logger.info('');
      }

      // Warnings about removed features
      logger.warn(
        'IMPORTANT: The following v1.x features are no longer supported:'
      );
      logger.warn(
        '- compose.order: Partial ordering is now based on extends array order'
      );
      logger.warn(
        '- compose.protectedLayers: Use "protected" array with specific partial IDs'
      );
      logger.warn(
        '- compose.teamAppend: Team content now works via extends array'
      );
      logger.warn(
        '- overrides.teamAppendContent: Create a local policy package instead'
      );
      logger.warn('');

      if (argv.dry) {
        logger.info('DRY RUN: Would write the following config:');
        logger.info('');
        logger.log(
          yaml.dump(newConfig, { indent: 2, lineWidth: -1, noRefs: true })
        );
        return;
      }

      // Backup old config
      const backupPath = path.join(projectRoot, '.ai-policies.yaml.v1.backup');
      await fs.copy(manifestPath, backupPath);
      logger.success(`Backed up old config to ${path.basename(backupPath)}`);

      // Write new config
      await saveManifest(manifestPath, newConfig);
      logger.success('Wrote new configuration');

      // Install packages if needed
      if (!argv.skipInstall) {
        logger.info('');
        logger.info('Installing packages...');
        try {
          const packages = newConfig.extends.filter(
            p => !p.startsWith('./') && !p.startsWith('/')
          );
          if (packages.length > 0) {
            execSync(`npm install ${packages.join(' ')}`, {
              cwd: projectRoot,
              stdio: 'inherit',
            });
            logger.success('Packages installed');
          }
        } catch (error) {
          logger.warn(
            'Failed to install packages. You may need to run npm install manually.'
          );
        }
      }

      logger.info('');
      logger.success('Migration completed!');
      logger.info('');
      logger.info('Next steps:');
      logger.info('1. Review the migrated .ai-policies.yaml');
      logger.info(
        '2. Update partial frontmatter to remove layer, weight, protected, dependsOn'
      );
      logger.info('3. Run "ai-policies sync" to regenerate IDE configurations');
      logger.info('4. Delete .ai-policies.yaml.v1.backup when satisfied');
    } catch (error) {
      logger.error(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};
