import path from 'path';
import fs from 'fs-extra';

import type {
  ManifestConfig,
  CompositionResult,
  Provider,
} from '@ai-policies/core-schemas';
import { PolicyRegistry, getPartials } from '@ai-policies/policy-registry';
import { PolicyComposer } from '@ai-policies/compose-engine';
import { renderCursorRules } from '@ai-policies/provider-cursor';
import { renderCopilotInstructions } from '@ai-policies/provider-copilot';

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
 * Generate IDE configuration content from policy packages
 */
export async function generateConfigurations(
  config: ManifestConfig,
  projectRoot: string
): Promise<SyncResult> {
  const result: SyncResult = {};

  // Load partials from policy packages
  const partials = await getPartials(config.requires);

  if (partials.length === 0) {
    throw new Error(
      'No policy partials found. Check your package requirements in .ai-policies.yaml'
    );
  }

  // Create composer instance
  const composer = new PolicyComposer();

  // Generate Cursor rules if configured
  if (config.output.cursor) {
    const cursorPath = path.resolve(projectRoot, config.output.cursor);
    const compositionResult = await composer.compose(partials, config, {
      provider: 'cursor' as Provider,
      teamAppendContent: config.overrides?.teamAppendContent,
      excludePartials: config.overrides?.excludePartials,
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
    const compositionResult = await composer.compose(partials, config, {
      provider: 'copilot' as Provider,
      teamAppendContent: config.overrides?.teamAppendContent,
      excludePartials: config.overrides?.excludePartials,
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
