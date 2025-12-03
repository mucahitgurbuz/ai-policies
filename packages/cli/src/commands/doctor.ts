import type { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs-extra';

import { findManifest, loadManifest } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface DoctorOptions {
  fix?: boolean;
}

export const doctorCommand: CommandModule<{}, DoctorOptions> = {
  command: 'doctor',
  describe: 'Check for common issues and configuration problems',
  builder: {
    fix: {
      alias: 'f',
      type: 'boolean',
      description: 'Automatically fix issues where possible',
      default: false,
    },
  },
  handler: async argv => {
    try {
      logger.info('🩺 Running AI Policies health check...\n');

      const issues = await runHealthChecks(argv.fix ?? false);

      if (issues.length === 0) {
        logger.success(
          '✨ All checks passed! Your AI Policies setup looks healthy.'
        );
        return;
      }

      logger.warn(`Found ${issues.length} issue(s):\n`);

      for (const issue of issues) {
        logger.error(`❌ ${issue.message}`);
        if (issue.fix) {
          logger.info(`   💡 Fix: ${issue.fix}`);
        }
        logger.log('');
      }

      if (argv.fix) {
        logger.info(
          'Some issues may have been automatically fixed. Please review the changes.'
        );
      } else {
        logger.info('Run with --fix to automatically resolve fixable issues.');
      }

      process.exit(1);
    } catch (error) {
      logger.error(
        `Doctor check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  },
};

interface HealthIssue {
  message: string;
  fix?: string;
  severity: 'error' | 'warning' | 'info';
}

async function runHealthChecks(autoFix: boolean): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];

  // Check 1: Manifest exists
  const manifestPath = await findManifest();
  if (!manifestPath) {
    issues.push({
      message: 'No .ai-policies.yaml found',
      fix: 'Run "ai-policies init" to create a configuration file',
      severity: 'error',
    });
    return issues; // Can't continue without manifest
  }

  const projectRoot = path.dirname(manifestPath);

  // Check 2: Valid manifest structure
  try {
    const config = await loadManifest(manifestPath);

    // Check 3: Output paths are valid
    if (config.output.cursor) {
      const cursorPath = path.resolve(projectRoot, config.output.cursor);
      const cursorDir = path.dirname(cursorPath);

      if (!(await fs.pathExists(cursorDir))) {
        issues.push({
          message: `Cursor output directory does not exist: ${path.relative(projectRoot, cursorDir)}`,
          fix: autoFix
            ? 'Creating directory...'
            : `Create directory: mkdir -p ${path.relative(projectRoot, cursorDir)}`,
          severity: 'warning',
        });

        if (autoFix) {
          await fs.ensureDir(cursorDir);
        }
      }
    }

    if (config.output.copilot) {
      const copilotPath = path.resolve(projectRoot, config.output.copilot);
      const copilotDir = path.dirname(copilotPath);

      if (!(await fs.pathExists(copilotDir))) {
        issues.push({
          message: `Copilot output directory does not exist: ${path.relative(projectRoot, copilotDir)}`,
          fix: autoFix
            ? 'Creating directory...'
            : `Create directory: mkdir -p ${path.relative(projectRoot, copilotDir)}`,
          severity: 'warning',
        });

        if (autoFix) {
          await fs.ensureDir(copilotDir);
        }
      }
    }

    // Check 4: File length limits
    if (
      config.output.cursor &&
      (await fs.pathExists(path.resolve(projectRoot, config.output.cursor)))
    ) {
      const cursorContent = await fs.readFile(
        path.resolve(projectRoot, config.output.cursor),
        'utf8'
      );
      if (cursorContent.length > 50000) {
        issues.push({
          message:
            'Cursor rules file is very large (>50KB). This may impact IDE performance.',
          fix: 'Consider reducing the number of policy packages or splitting into more focused rules',
          severity: 'warning',
        });
      }
    }

    // Check 5: Empty sections
    await checkForEmptySections(config, projectRoot, issues);

    // Check 6: Duplicate packages
    const packageNames = Object.keys(config.requires);
    const duplicates = packageNames.filter(
      (name, index) => packageNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      issues.push({
        message: `Duplicate packages found: ${duplicates.join(', ')}`,
        fix: 'Remove duplicate entries from requires section',
        severity: 'error',
      });
    }

    // Check 7: Missing metadata in generated files
    await checkGeneratedFileMetadata(config, projectRoot, issues);
  } catch (error) {
    issues.push({
      message: `Invalid manifest file: ${error instanceof Error ? error.message : String(error)}`,
      fix: 'Fix the YAML syntax in .ai-policies.yaml or run "ai-policies init" to recreate',
      severity: 'error',
    });
  }

  return issues;
}

async function checkForEmptySections(
  config: any,
  projectRoot: string,
  issues: HealthIssue[]
) {
  const outputs = [
    { path: config.output.cursor, type: 'Cursor' },
    { path: config.output.copilot, type: 'Copilot' },
  ];

  for (const output of outputs) {
    if (!output.path) continue;

    const filePath = path.resolve(projectRoot, output.path);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf8');
      const contentWithoutComments = content
        .replace(/<!--[\\s\\S]*?-->/g, '')
        .trim();

      if (contentWithoutComments.length < 100) {
        issues.push({
          message: `${output.type} output file appears to be mostly empty`,
          fix: 'Run "ai-policies sync" to regenerate content',
          severity: 'warning',
        });
      }
    }
  }
}

async function checkGeneratedFileMetadata(
  config: any,
  projectRoot: string,
  issues: HealthIssue[]
) {
  const outputs = [
    { path: config.output.cursor, type: 'Cursor' },
    { path: config.output.copilot, type: 'Copilot' },
  ];

  for (const output of outputs) {
    if (!output.path) continue;

    const filePath = path.resolve(projectRoot, output.path);
    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf8');

      if (!content.includes('AI-POLICIES-META:')) {
        issues.push({
          message: `${output.type} output file is missing metadata header`,
          fix: 'Run "ai-policies sync" to regenerate with proper metadata',
          severity: 'info',
        });
      }
    }
  }
}
