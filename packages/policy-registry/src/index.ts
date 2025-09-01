import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import matter from 'gray-matter';

import type { PolicyPackage, PolicyPartial, PolicyPackageConfig } from '@ai-policies/core-schemas';
import { validatePartialFrontmatter, validatePackageConfig } from '@ai-policies/core-schemas';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    const policiesDir = path.join(__dirname, '..', 'policies');
    const packageDirs = await fs.readdir(policiesDir);

    for (const packageDir of packageDirs) {
      const packagePath = path.join(policiesDir, packageDir);
      const stat = await fs.stat(packagePath);

      if (stat.isDirectory()) {
        try {
          const policyPackage = await this.loadPolicyPackage(packagePath);
          this.packages.set(policyPackage.config.name, policyPackage);
        } catch (error) {
          console.warn(\`Failed to load policy package from \${packagePath}:\`, error);
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
  async resolvePackages(requirements: Record<string, string>): Promise<PolicyPackage[]> {
    await this.initialize();
    const resolved: PolicyPackage[] = [];

    for (const [packageName, versionRange] of Object.entries(requirements)) {
      const pkg = this.packages.get(packageName);
      if (pkg) {
        // In a real implementation, this would do proper semver resolution
        resolved.push(pkg);
      } else {
        console.warn(\`Package not found in registry: \${packageName}\`);
      }
    }

    return resolved;
  }

  /**
   * Get all partials from resolved packages
   */
  async getPartials(requirements: Record<string, string>): Promise<PolicyPartial[]> {
    const packages = await this.resolvePackages(requirements);
    const allPartials: PolicyPartial[] = [];

    for (const pkg of packages) {
      allPartials.push(...pkg.partials);
    }

    return allPartials;
  }

  /**
   * Load a policy package from a directory
   */
  private async loadPolicyPackage(packagePath: string): Promise<PolicyPackage> {
    // Load package.json
    const packageJsonPath = path.join(packagePath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath) as PolicyPackageConfig;

    // Validate package configuration
    const validation = validatePackageConfig(packageJson);
    if (!validation.valid) {
      throw new Error(\`Invalid package configuration: \${validation.errors.map(e => e.message).join(', ')}\`);
    }

    // Load partials
    const partials = await this.loadPartials(packagePath, packageJson);

    return {
      config: packageJson,
      partials,
      rootPath: packagePath,
    };
  }

  /**
   * Load all partials from a package directory
   */
  private async loadPartials(packagePath: string, config: PolicyPackageConfig): Promise<PolicyPartial[]> {
    const partials: PolicyPartial[] = [];
    const aiPoliciesConfig = config['ai-policies'];

    if (!aiPoliciesConfig?.partials) {
      return partials;
    }

    // Load partials for each provider
    for (const [provider, partialsDir] of Object.entries(aiPoliciesConfig.partials)) {
      const fullPartialsPath = path.join(packagePath, partialsDir);

      if (await fs.pathExists(fullPartialsPath)) {
        const providerPartials = await this.loadPartialsFromDirectory(
          fullPartialsPath,
          config,
          provider as 'cursor' | 'copilot'
        );
        partials.push(...providerPartials);
      }
    }

    return partials;
  }

  /**
   * Load partials from a specific directory
   */
  private async loadPartialsFromDirectory(
    directory: string,
    config: PolicyPackageConfig,
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
          console.warn(\`Invalid frontmatter in \${filePath}:\`, validation.errors);
          continue;
        }

        // Create partial
        const partial: PolicyPartial = {
          frontmatter: parsed.data as any,
          content: parsed.content,
          filePath: path.relative(directory, filePath),
          packageName: config.name,
          packageVersion: config.version,
        };

        // Add provider filter if not specified
        if (!partial.frontmatter.providers) {
          partial.frontmatter.providers = [provider];
        }

        partials.push(partial);
      } catch (error) {
        console.warn(\`Failed to load partial from \${filePath}:\`, error);
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

export async function resolvePackages(requirements: Record<string, string>): Promise<PolicyPackage[]> {
  return defaultRegistry.resolvePackages(requirements);
}

export async function getPartials(requirements: Record<string, string>): Promise<PolicyPartial[]> {
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
