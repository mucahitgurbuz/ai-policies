import path from 'path';
import fs from 'fs-extra';

import type {
  ManifestConfig,
  Provider,
} from '../../schemas/types.js';
import { resolveExtendsArray, getAllPartials, getDefaultProtectedPartials } from '../../packages/resolver.js';
import { PolicyComposer } from '../../compose/composer.js';
import { renderCursorRules } from '../../providers/cursor-provider.js';
import { renderCopilotInstructions } from '../../providers/copilot-provider.js';

export interface SyncResult {
  cursor?: {
    path: string;
    content: string;
  };
  copilot?: {
    path: string;
    content: string;
  };
}

/**
 * Generate IDE configuration content from policy packages (v2.0)
 */
export async function generateConfigurations(
  config: ManifestConfig,
  projectRoot: string
): Promise<SyncResult> {
  const result: SyncResult = {};

  // Resolve all packages from extends array
  const packages = await resolveExtendsArray(config.extends, projectRoot);

  if (packages.length === 0) {
    throw new Error(
      'No policy packages found. Check your extends entries in .ai-policies.yaml'
    );
  }

  // Get all partials from packages
  const allPartials = getAllPartials(packages);

  if (allPartials.length === 0) {
    throw new Error(
      'No policy partials found in the resolved packages.'
    );
  }

  // Combine protected partials from config and package defaults
  const defaultProtected = getDefaultProtectedPartials(packages);
  const protectedPartials = [
    ...new Set([...(config.protected || []), ...defaultProtected]),
  ];

  // Create composer instance
  const composer = new PolicyComposer();

  // Generate Cursor rules if configured
  if (config.output.cursor) {
    const cursorPath = path.resolve(projectRoot, config.output.cursor);
    const compositionResult = await composer.compose(allPartials, config, {
      provider: 'cursor' as Provider,
      protected: protectedPartials,
      exclude: config.exclude,
    });

    const cursorContent = renderCursorRules(compositionResult, {
      includeCategories: true,
      includeAttribution: true,
    });

    result.cursor = {
      path: cursorPath,
      content: cursorContent,
    };
  }

  // Generate Copilot instructions if configured
  if (config.output.copilot) {
    const copilotPath = path.resolve(projectRoot, config.output.copilot);
    const compositionResult = await composer.compose(allPartials, config, {
      provider: 'copilot' as Provider,
      protected: protectedPartials,
      exclude: config.exclude,
    });

    const copilotContent = renderCopilotInstructions(compositionResult, {
      includeSafetyConstraints: true,
      includePromptTemplates: true,
      includeCodeExamples: true,
    });

    result.copilot = {
      path: copilotPath,
      content: copilotContent,
    };
  }

  return result;
}

/**
 * Write generated configurations to disk
 */
export async function writeConfigurations(result: SyncResult): Promise<void> {
  if (result.cursor) {
    await fs.ensureDir(path.dirname(result.cursor.path));
    await fs.writeFile(result.cursor.path, result.cursor.content, 'utf8');
  }

  if (result.copilot) {
    await fs.ensureDir(path.dirname(result.copilot.path));
    await fs.writeFile(result.copilot.path, result.copilot.content, 'utf8');
  }
}

/**
 * Read existing configuration files
 */
export async function readExistingConfigurations(
  config: ManifestConfig,
  projectRoot: string
): Promise<{ cursor?: string; copilot?: string }> {
  const existing: { cursor?: string; copilot?: string } = {};

  if (config.output.cursor) {
    const cursorPath = path.resolve(projectRoot, config.output.cursor);
    if (await fs.pathExists(cursorPath)) {
      existing.cursor = await fs.readFile(cursorPath, 'utf8');
    }
  }

  if (config.output.copilot) {
    const copilotPath = path.resolve(projectRoot, config.output.copilot);
    if (await fs.pathExists(copilotPath)) {
      existing.copilot = await fs.readFile(copilotPath, 'utf8');
    }
  }

  return existing;
}
