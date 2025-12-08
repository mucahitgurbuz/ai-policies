/**
 * TypeScript types for AI Policies
 * ESLint-style configuration with array-based extends and simplified partials
 */

export type Provider = 'cursor' | 'copilot';

/**
 * Manifest configuration
 * Uses array-based extends with "last wins" conflict resolution
 */
export interface ManifestConfig {
  /** Policy packages to extend (array order matters - last wins) */
  extends: string[];

  /** Output file paths for different IDE providers */
  output: {
    cursor?: string;
    copilot?: string;
  };

  /** Partial IDs that cannot be overridden by later packages */
  protected?: string[];

  /** Partial IDs to exclude from final output */
  exclude?: string[];
}

/**
 * Partial frontmatter
 */
export interface PartialFrontmatter {
  /** Unique identifier for this partial within its package */
  id: string;

  /** Human-readable description of what this partial does */
  description?: string;

  /** Team or individual responsible for maintaining this partial */
  owner?: string;

  /** Optional tags for categorizing and filtering partials */
  tags?: string[];

  /** IDE providers this partial applies to (if not specified, applies to all) */
  providers?: Provider[];
}

/**
 * A policy partial with content and metadata
 */
export interface PolicyPartial {
  /** Frontmatter metadata */
  frontmatter: PartialFrontmatter;

  /** Markdown content of the partial */
  content: string;

  /** File path relative to package root */
  filePath: string;

  /** Package this partial belongs to */
  packageName: string;

  /** Package version */
  packageVersion: string;

  /** Order index from extends array (for conflict resolution) */
  sourceIndex: number;
}

/**
 * npm package export format for policy packages
 */
export interface PolicyPackageExport {
  /** Package name */
  name: string;

  /** Path to partials directory (relative to package root) */
  partials: string;

  /** Partials that should be protected by default when using this package */
  defaultProtected?: string[];
}

/**
 * Policy package configuration (from package.json)
 */
export interface PolicyPackageConfig {
  /** Package name in scoped format */
  name: string;

  /** Semantic version */
  version: string;

  /** Package description */
  description?: string;

  /** Keywords for package discovery */
  keywords?: string[];

  /** License identifier (SPDX) */
  license?: string;

  /** Package author */
  author?: string;

  /** Homepage URL */
  homepage?: string;

  /** Repository information */
  repository?: {
    type: 'git';
    url: string;
  };

  /** Package dependencies */
  dependencies?: Record<string, string>;

  /** AI Policies specific configuration */
  'ai-policies'?: {
    /** Directory containing partials */
    partials?: string;
    /** Tags that apply to all partials in this package */
    tags?: string[];
  };
}

/**
 * Resolved policy package
 */
export interface PolicyPackage {
  /** Package configuration */
  config: PolicyPackageConfig;

  /** All partials in this package */
  partials: PolicyPartial[];

  /** Package root directory */
  rootPath: string;

  /** Default protected partials declared by this package */
  defaultProtected: string[];
}

/**
 * Result of policy composition
 */
export interface CompositionResult {
  /** Generated content */
  content: string;

  /** Metadata about the composition */
  metadata: CompositionMetadata;
}

/**
 * Metadata about a composition
 */
export interface CompositionMetadata {
  /** Package versions used in composition */
  packages: Record<string, string>;

  /** Content hash for change detection */
  contentHash: string;

  /** Generation timestamp */
  generatedAt: string;

  /** Partials included in composition (in order) */
  partials: Array<{
    id: string;
    packageName: string;
  }>;

  /** Protected partials that were preserved */
  protectedPartials: string[];
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  /** Partial ID that had conflicts */
  partialId: string;

  /** Winning partial (last in extends order, unless protected) */
  winner: PolicyPartial;

  /** Losing partials that were overridden */
  overridden: PolicyPartial[];

  /** Reason for the resolution */
  reason: 'last-wins' | 'protected';
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error message */
  message: string;

  /** Path to the invalid property */
  path: string;

  /** Schema validation keyword that failed */
  keyword?: string;

  /** Invalid value */
  value?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors if any */
  errors: ValidationError[];
}
