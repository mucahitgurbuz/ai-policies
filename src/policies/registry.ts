import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

import type { PolicyPackage, PolicyPartial } from '../schemas/types.js';
import { validatePartialFrontmatter } from '../schemas/validator.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Built-in policy package metadata
const BUILTIN_POLICIES: Record<
  string,
  { name: string; version: string; description: string }
> = {
  core: {
    name: '@ai-policies/core',
    version: '1.0.0',
    description: 'Core AI policies for safety, security, and quality',
  },
  'frontend-react': {
    name: '@ai-policies/frontend-react',
    version: '1.0.0',
    description: 'React and frontend development best practices',
  },
  'workflows-jira': {
    name: '@ai-policies/workflows-jira',
    version: '1.0.0',
    description: 'Jira integration and workflow guidelines',
  },
};

/**
 * Registry for built-in policy packages
 */
export class PolicyRegistry {
  private packages: Map<string, PolicyPackage> = new Map();
  private initialized = false;

  /**
   * Initialize the registry by loading all policy packages
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const policiesDir = __dirname;

    for (const [dirName, metadata] of Object.entries(BUILTIN_POLICIES)) {
      const packagePath = path.join(policiesDir, dirName);

      if (await fs.pathExists(packagePath)) {
        try {
          const partials = await this.loadPartials(packagePath, metadata.name);
          this.packages.set(metadata.name, {
            config: {
              name: metadata.name,
              version: metadata.version,
              description: metadata.description,
            },
            partials,
            rootPath: packagePath,
          });
        } catch (error) {
          console.warn(`Failed to load policy package ${dirName}:`, error);
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Get all available policy packages
   */
  async getPackages(): Promise<PolicyPackage[]> {
    await this.initialize();
    return Array.from(this.packages.values());
  }

  /**
   * Get a specific policy package by name
   */
  async getPackage(name: string): Promise<PolicyPackage | undefined> {
    await this.initialize();
    return this.packages.get(name);
  }

  /**
   * Get packages that match the specified requirements
   */
  async resolvePackages(
    requirements: Record<string, string>
  ): Promise<PolicyPackage[]> {
    await this.initialize();
    const resolved: PolicyPackage[] = [];

    for (const packageName of Object.keys(requirements)) {
      const pkg = this.packages.get(packageName);
      if (pkg) {
        resolved.push(pkg);
      } else {
        console.warn(`Package not found in registry: ${packageName}`);
      }
    }

    return resolved;
  }

  /**
   * Get all partials from resolved packages
   */
  async getPartials(
    requirements: Record<string, string>
  ): Promise<PolicyPartial[]> {
    const packages = await this.resolvePackages(requirements);
    const allPartials: PolicyPartial[] = [];

    for (const pkg of packages) {
      allPartials.push(...pkg.partials);
    }

    return allPartials;
  }

  /**
   * Load all partials from a package directory
   */
  private async loadPartials(
    packagePath: string,
    packageName: string
  ): Promise<PolicyPartial[]> {
    const partials: PolicyPartial[] = [];

    // Load cursor partials
    const cursorDir = path.join(packagePath, 'cursor', 'partials');
    if (await fs.pathExists(cursorDir)) {
      const cursorPartials = await this.loadPartialsFromDirectory(
        cursorDir,
        packageName,
        'cursor'
      );
      partials.push(...cursorPartials);
    }

    // Load copilot partials
    const copilotDir = path.join(packagePath, 'copilot', 'partials');
    if (await fs.pathExists(copilotDir)) {
      const copilotPartials = await this.loadPartialsFromDirectory(
        copilotDir,
        packageName,
        'copilot'
      );
      partials.push(...copilotPartials);
    }

    return partials;
  }

  /**
   * Load partials from a specific directory
   */
  private async loadPartialsFromDirectory(
    directory: string,
    packageName: string,
    provider: 'cursor' | 'copilot'
  ): Promise<PolicyPartial[]> {
    const partials: PolicyPartial[] = [];
    const pattern = path.join(directory, '**/*.md');
    const files = await glob(pattern);

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = matter(content);

        // Validate frontmatter
        const validation = validatePartialFrontmatter(parsed.data);
        if (!validation.valid) {
          console.warn(
            `Invalid frontmatter in ${filePath}:`,
            validation.errors
          );
          continue;
        }

        // Create partial
        const partial: PolicyPartial = {
          frontmatter: parsed.data as PolicyPartial['frontmatter'],
          content: parsed.content,
          filePath: path.relative(directory, filePath),
          packageName,
          packageVersion: '1.0.0',
        };

        // Add provider filter if not specified
        if (!partial.frontmatter.providers) {
          partial.frontmatter.providers = [provider];
        }

        partials.push(partial);
      } catch (error) {
        console.warn(`Failed to load partial from ${filePath}:`, error);
      }
    }

    return partials;
  }
}

/**
 * Default registry instance
 */
export const defaultRegistry = new PolicyRegistry();

/**
 * Convenience functions
 */
export async function getAvailablePackages(): Promise<PolicyPackage[]> {
  return defaultRegistry.getPackages();
}

export async function resolvePackages(
  requirements: Record<string, string>
): Promise<PolicyPackage[]> {
  return defaultRegistry.resolvePackages(requirements);
}

export async function getPartials(
  requirements: Record<string, string>
): Promise<PolicyPartial[]> {
  return defaultRegistry.getPartials(requirements);
}

/**
 * Built-in package constants
 */
export const BUILTIN_PACKAGES = {
  CORE: '@ai-policies/core',
  FRONTEND_REACT: '@ai-policies/frontend-react',
  WORKFLOWS_JIRA: '@ai-policies/workflows-jira',
} as const;
