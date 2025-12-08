/**
 * TypeScript types derived from JSON schemas
 */

export type Layer = 'core' | 'domain' | 'stack' | 'team';
export type Provider = 'cursor' | 'copilot';

export interface ManifestConfig {
  /** Policy packages to extend (ESLint-style) */
  extends: Record<string, string>;

  /** Output file paths for different IDE providers */
  output: {
    cursor?: string;
    copilot?: string;
  };

  /** Composition settings for merging policy partials */
  compose: {
    /** Layer composition order (higher priority layers come later) */
    order: Layer[];
    /** Layers that cannot be overridden by higher priority layers */
    protectedLayers: Layer[];
    /** Allow team layer to append content rather than override */
    teamAppend: boolean;
  };

  /** Team-specific overrides and customizations */
  overrides?: {
    /** Additional content to append to team layer */
    teamAppendContent?: string;
    /** Partial IDs to exclude from composition */
    excludePartials?: string[];
  };
}

export interface PartialFrontmatter {
  /** Unique identifier for this partial within its package */
  id: string;

  /** Composition layer for this partial */
  layer: Layer;

  /** Ordering weight within the layer (lower weights come first) */
  weight: number;

  /** Whether this partial's content is protected from being overridden */
  protected: boolean;

  /** List of partial IDs that this partial depends on */
  dependsOn: string[];

  /** Team or individual responsible for maintaining this partial */
  owner: string;

  /** Optional tags for categorizing and filtering partials */
  tags?: string[];

  /** IDE providers this partial applies to (if not specified, applies to all) */
  providers?: Provider[];

  /** Version when this partial was last modified */
  version?: string;

  /** Human-readable description of what this partial does */
  description?: string;
}

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
}

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
    /** Directory containing unified partials (applies to all providers) */
    partials?: string;
    /** Tags that apply to all partials in this package */
    tags?: string[];
  };
}

export interface PolicyPackage {
  /** Package configuration */
  config: PolicyPackageConfig;

  /** All partials in this package */
  partials: PolicyPartial[];

  /** Package root directory */
  rootPath: string;
}

export interface CompositionResult {
  /** Generated content */
  content: string;

  /** Metadata about the composition */
  metadata: CompositionMetadata;
}

export interface CompositionMetadata {
  /** Package versions used in composition */
  packages: Record<string, string>;

  /** Content hash for change detection */
  contentHash: string;

  /** Generation timestamp */
  generatedAt: string;

  /** Partials included in composition */
  partials: Array<{
    id: string;
    packageName: string;
    layer: Layer;
    weight: number;
  }>;

  /** Composition settings used */
  settings: {
    order: Layer[];
    protectedLayers: Layer[];
    teamAppend: boolean;
  };
}

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

export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors if any */
  errors: ValidationError[];
}

export interface DependencyResolution {
  /** Resolved package versions */
  resolved: Record<string, string>;

  /** Dependency conflicts if any */
  conflicts: Array<{
    package: string;
    requested: string[];
    resolved?: string;
  }>;

  /** Missing dependencies */
  missing: string[];
}
