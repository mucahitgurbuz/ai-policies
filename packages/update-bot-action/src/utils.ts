import type { ActionInputs } from './action.js';

/**
 * Parse a comma-separated list of repositories
 */
export function parseRepositoryList(input: string): string[] {
  if (!input.trim()) {
    return [];
  }

  return input
    .split(',')
    .map(repo => repo.trim())
    .filter(repo => {
      if (!repo) return false;

      // Validate repository format (owner/repo)
      const parts = repo.split('/');
      if (parts.length !== 2) {
        throw new Error(
          `Invalid repository format: '${repo}'. Expected format: 'owner/repo'`
        );
      }

      return true;
    });
}

/**
 * Validate action inputs
 */
export function validateInputs(inputs: ActionInputs): void {
  if (!inputs.token) {
    throw new Error('GitHub token is required');
  }

  if (!inputs.repositories.length && !inputs.organization) {
    throw new Error('Either repositories or organization must be specified');
  }

  if (inputs.repositories.length && inputs.organization) {
    throw new Error('Cannot specify both repositories and organization');
  }

  // Validate branch name
  if (!/^[a-zA-Z0-9/_-]+$/.test(inputs.branchName)) {
    throw new Error(`Invalid branch name: '${inputs.branchName}'`);
  }

  // Validate reviewers (GitHub usernames)
  for (const reviewer of inputs.reviewers) {
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(reviewer)) {
      throw new Error(`Invalid GitHub username: '${reviewer}'`);
    }
  }

  // Validate team reviewers
  for (const team of inputs.teamReviewers) {
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(team)) {
      throw new Error(`Invalid team name: '${team}'`);
    }
  }
}

/**
 * Format pull request body with template variables
 */
export function formatPullRequestBody(
  template: string,
  variables: {
    repository: string;
    branch: string;
    timestamp: string;
  }
): string {
  let formatted = template;

  // Replace template variables
  formatted = formatted.replace(/\\$\\{repository\\}/g, variables.repository);
  formatted = formatted.replace(/\\$\\{branch\\}/g, variables.branch);
  formatted = formatted.replace(/\\$\\{timestamp\\}/g, variables.timestamp);
  formatted = formatted.replace(
    /\\$\\{date\\}/g,
    new Date().toLocaleDateString()
  );
  formatted = formatted.replace(
    /\\$\\{time\\}/g,
    new Date().toLocaleTimeString()
  );

  return formatted;
}

/**
 * Create a summary of changes for the pull request
 */
export function createChangesSummary(changes: {
  modified: string[];
  added: string[];
  deleted: string[];
}): string {
  const lines: string[] = [];

  if (changes.added.length > 0) {
    lines.push('### ✅ Files Added');
    for (const file of changes.added) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('### 📝 Files Modified');
    for (const file of changes.modified) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (changes.deleted.length > 0) {
    lines.push('### ❌ Files Deleted');
    for (const file of changes.deleted) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  return lines.join('\\n');
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      console.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if a string is a valid GitHub repository identifier
 */
export function isValidRepositoryIdentifier(repo: string): boolean {
  const parts = repo.split('/');
  if (parts.length !== 2) {
    return false;
  }

  const [owner, name] = parts;

  // GitHub username/organization rules
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner)) {
    return false;
  }

  // GitHub repository name rules
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return false;
  }

  return true;
}

/**
 * Generate a unique branch name with timestamp
 */
export function generateBranchName(baseName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${baseName}-${timestamp}`;
}

/**
 * Extract package version information from AI Policies output
 */
export function extractPackageVersions(
  content: string
): Record<string, string> {
  const packages: Record<string, string> = {};

  // Look for AI-POLICIES-META comment
  const metaMatch = content.match(
    /<!--\\s*AI-POLICIES-META:\\s*([^-]+)\\s*-->/
  );

  if (metaMatch) {
    try {
      const base64Data = metaMatch[1]?.trim();
      if (base64Data) {
        const jsonStr = Buffer.from(base64Data, 'base64').toString('utf8');
        const metadata = JSON.parse(jsonStr);
        return metadata.packages || {};
      }
    } catch (error) {
      console.warn('Failed to parse metadata from AI Policies output:', error);
    }
  }

  return packages;
}
