import type {
  PolicyPartial,
  Provider,
  ConflictResolution,
} from '../schemas/types.js';

/**
 * Options for composing policies
 */
export interface CompositionOptions {
  /** Provider to compose for (affects which partials are included) */
  provider: Provider;

  /** Whether to include debug information in output */
  debug?: boolean;

  /** Custom content transformers */
  transformers?: ContentTransformer[];

  /** Partial IDs that cannot be overridden (from config) */
  protected?: string[];

  /** Partial IDs to exclude from composition */
  exclude?: string[];
}

/**
 * Content transformer
 */
export interface ContentTransformer {
  /** Transformer name */
  name: string;

  /** Transform function */
  transform: (content: string, context: TransformContext) => string;

  /** Order priority (lower = earlier) */
  priority: number;
}

/**
 * Context passed to content transformers
 */
export interface TransformContext {
  /** Current partial being processed */
  partial: PolicyPartial;

  /** Provider being composed for */
  provider: Provider;

  /** All partials in composition */
  allPartials: PolicyPartial[];
}

/**
 * Error during composition
 */
export interface CompositionError {
  /** Error message */
  message: string;

  /** Error type */
  type: 'validation' | 'resolution' | 'conflict' | 'protected';

  /** Related partial ID if applicable */
  partialId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Result of partial deduplication with "last wins" strategy
 */
export interface DeduplicationResult {
  /** Deduplicated partials (in order) */
  partials: PolicyPartial[];

  /** Conflict resolutions that occurred */
  conflicts: ConflictResolution[];

  /** Warnings about protected partials that were preserved */
  protectedWarnings: string[];
}
