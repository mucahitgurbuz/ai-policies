import type {
  PolicyPartial,
  ManifestConfig,
  CompositionResult,
  CompositionMetadata,
  Provider
} from '@ai-policies/core-schemas';

export interface CompositionOptions {
  /** Provider to compose for (affects which partials are included) */
  provider: Provider;

  /** Whether to include debug information in output */
  debug?: boolean;

  /** Custom content transformers */
  transformers?: ContentTransformer[];

  /** Team append content to add at the end */
  teamAppendContent?: string;

  /** Partial IDs to exclude from composition */
  excludePartials?: string[];
}

export interface ContentTransformer {
  /** Transformer name */
  name: string;

  /** Transform function */
  transform: (content: string, context: TransformContext) => string;

  /** Order priority (lower = earlier) */
  priority: number;
}

export interface TransformContext {
  /** Current partial being processed */
  partial: PolicyPartial;

  /** Provider being composed for */
  provider: Provider;

  /** All partials in composition */
  allPartials: PolicyPartial[];

  /** Composition settings */
  settings: ManifestConfig['compose'];
}

export interface CompositionError {
  /** Error message */
  message: string;

  /** Error type */
  type: 'validation' | 'dependency' | 'conflict' | 'protected' | 'circular';

  /** Related partial ID if applicable */
  partialId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

export interface DependencyResolutionResult {
  /** Resolved order of partials */
  resolved: PolicyPartial[];

  /** Circular dependencies detected */
  circular: string[][];

  /** Missing dependencies */
  missing: Array<{
    partialId: string;
    missingDeps: string[];
  }>;
}

export interface ProtectedBlock {
  /** Block identifier */
  id: string;

  /** Block content */
  content: string;

  /** Source partial */
  source: PolicyPartial;

  /** Start and end markers */
  markers: {
    start: string;
    end: string;
  };
}

export interface ConflictResolution {
  /** Winning partial */
  winner: PolicyPartial;

  /** Losing partials */
  losers: PolicyPartial[];

  /** Reason for resolution */
  reason: 'layer-priority' | 'weight' | 'protected' | 'explicit';
}
