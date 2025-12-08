/**
 * Package resolver for AI Policies
 * Resolves npm packages and local paths to policy packages
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

import type {
  PolicyPackage,
  PolicyPackageConfig,
  PolicyPackageExport,
  PolicyPartial,
  PartialFrontmatter,
} from '../schemas/types.js';
import { validatePartialFrontmatter } from '../schemas/validator.js';
import { isLocalPath } from '../schemas/utils.js';

/**
 * Resolve a single package from extends entry
 */
export async function resolvePackage(
  entry: string,
  projectRoot: string,
  sourceIndex: number
): Promise<PolicyPackage> {
  const packagePath = isLocalPath(entry)
    ? resolveLocalPath(entry, projectRoot)
    : resolveNpmPackage(entry, projectRoot);

  if (!packagePath) {
    throw new Error(`Could not resolve package: ${entry}`);
  }

  return loadPackage(packagePath, entry, sourceIndex);
}

/**
 * Resolve a local path to absolute path
 */
function resolveLocalPath(localPath: string, projectRoot: string): string {
  return path.resolve(projectRoot, localPath);
}

/**
 * Resolve an npm package from node_modules
 */
function resolveNpmPackage(
  packageName: string,
  projectRoot: string
): string | null {
  // Try to resolve from project's node_modules
  const possiblePaths = [
    path.join(projectRoot, 'node_modules', packageName),
    // Try parent directories for monorepo setups
    path.join(projectRoot, '..', 'node_modules', packageName),
    path.join(projectRoot, '..', '..', 'node_modules', packageName),
  ];

  for (const pkgPath of possiblePaths) {
    if (fs.existsSync(pkgPath)) {
      return pkgPath;
    }
  }

  // Try Node.js require.resolve
  try {
    const resolved = require.resolve(`${packageName}/package.json`, {
      paths: [projectRoot],
    });
    return path.dirname(resolved);
  } catch {
    return null;
  }
}

/**
 * Load a package from a resolved path
 */
async function loadPackage(
  packagePath: string,
  originalEntry: string,
  sourceIndex: number
): Promise<PolicyPackage> {
  // Check if path exists
  if (!(await fs.pathExists(packagePath))) {
    throw new Error(`Package path does not exist: ${packagePath}`);
  }

  // Load package.json if it exists
  const packageJsonPath = path.join(packagePath, 'package.json');
  let config: PolicyPackageConfig;
  let defaultProtected: string[] = [];

  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    config = {
      name: packageJson.name || originalEntry,
      version: packageJson.version || '0.0.0',
      description: packageJson.description,
      keywords: packageJson.keywords,
      license: packageJson.license,
      author: packageJson.author,
      homepage: packageJson.homepage,
      repository: packageJson.repository,
      'ai-policies': packageJson['ai-policies'],
    };

    // Try to load index.js for defaultProtected
    const indexPath = path.join(packagePath, 'index.js');
    if (await fs.pathExists(indexPath)) {
      try {
        const pkgExport = (await import(indexPath)) as {
          default?: PolicyPackageExport;
        };
        if (pkgExport.default?.defaultProtected) {
          defaultProtected = pkgExport.default.defaultProtected;
        }
      } catch {
        // Ignore import errors
      }
    }
  } else {
    // Local path without package.json
    config = {
      name: originalEntry,
      version: '0.0.0',
    };
  }

  // Determine partials directory
  const partialsDir = config['ai-policies']?.partials
    ? path.join(packagePath, config['ai-policies'].partials)
    : path.join(packagePath, 'partials');

  // Load partials
  const partials = await loadPartials(
    partialsDir,
    config.name,
    config.version,
    sourceIndex
  );

  return {
    config,
    partials,
    rootPath: packagePath,
    defaultProtected,
  };
}

/**
 * Load all partials from a directory
 */
async function loadPartials(
  partialsDir: string,
  packageName: string,
  packageVersion: string,
  sourceIndex: number
): Promise<PolicyPartial[]> {
  if (!(await fs.pathExists(partialsDir))) {
    return [];
  }

  const pattern = path.join(partialsDir, '**/*.md');
  const files = await glob(pattern);
  const partials: PolicyPartial[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = matter(content);

      // Validate frontmatter
      const validation = validatePartialFrontmatter(parsed.data);
      if (!validation.valid) {
        console.warn(
          `Invalid frontmatter in ${filePath}:`,
          validation.errors.map(e => e.message).join(', ')
        );
        continue;
      }

      const frontmatter = parsed.data as PartialFrontmatter;

      partials.push({
        frontmatter,
        content: parsed.content,
        filePath: path.relative(partialsDir, filePath),
        packageName,
        packageVersion,
        sourceIndex,
      });
    } catch (error) {
      console.warn(`Failed to load partial from ${filePath}:`, error);
    }
  }

  return partials;
}

/**
 * Resolve all packages from extends array
 * Returns packages in order (for "last wins" conflict resolution)
 */
export async function resolveExtendsArray(
  extendsArray: string[],
  projectRoot: string
): Promise<PolicyPackage[]> {
  const packages: PolicyPackage[] = [];

  for (let i = 0; i < extendsArray.length; i++) {
    const entry = extendsArray[i];
    try {
      const pkg = await resolvePackage(entry, projectRoot, i);
      packages.push(pkg);
    } catch (error) {
      throw new Error(
        `Failed to resolve package '${entry}': ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return packages;
}

/**
 * Get all partials from resolved packages (in extends order)
 */
export function getAllPartials(packages: PolicyPackage[]): PolicyPartial[] {
  const allPartials: PolicyPartial[] = [];

  for (const pkg of packages) {
    allPartials.push(...pkg.partials);
  }

  return allPartials;
}

/**
 * Get all default protected partial IDs from packages
 */
export function getDefaultProtectedPartials(
  packages: PolicyPackage[]
): string[] {
  const protected_: string[] = [];

  for (const pkg of packages) {
    protected_.push(...pkg.defaultProtected);
  }

  return [...new Set(protected_)];
}
