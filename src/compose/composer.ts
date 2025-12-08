import type {
  PolicyPartial,
  ManifestConfig,
  CompositionResult,
  Provider,
} from '../schemas/types.js';
import {
  shouldIncludePartialForProvider,
  createCompositionMetadata,
  generateMetadataHeader,
} from '../schemas/utils.js';

import type {
  CompositionOptions,
  CompositionError,
  ContentTransformer,
} from './types.js';
import { mergePartials } from './merger.js';
import { deduplicatePartials, sortPartialsBySourceIndex } from './utils.js';

/**
 * Main composition engine (v2.0)
 * Uses "last wins" conflict resolution with protected partial support
 */
export class PolicyComposer {
  private transformers: ContentTransformer[] = [];

  constructor() {
    // Add default transformers
    this.addTransformer({
      name: 'remove-empty-lines',
      priority: 100,
      transform: content => content.replace(/\n\s*\n\s*\n/g, '\n\n'),
    });
  }

  /**
   * Add a content transformer
   */
  addTransformer(transformer: ContentTransformer): void {
    this.transformers.push(transformer);
    this.transformers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Compose policies into a single output (v2.0)
   */
  async compose(
    partials: PolicyPartial[],
    config: ManifestConfig,
    options: CompositionOptions
  ): Promise<CompositionResult> {
    const errors: CompositionError[] = [];
    const protectedIds = options.protected || config.protected || [];
    const excludeIds = options.exclude || config.exclude || [];

    try {
      // Step 1: Filter partials for the target provider
      const filteredPartials = partials.filter(partial =>
        shouldIncludePartialForProvider(partial.frontmatter, options.provider)
      );

      // Step 2: Exclude specified partials
      const includedPartials = filteredPartials.filter(
        partial => !excludeIds.includes(partial.frontmatter.id)
      );

      // Step 3: Deduplicate partials with "last wins" (respecting protected)
      const { partials: deduplicatedPartials, conflicts, protectedWarnings } =
        deduplicatePartials(includedPartials, protectedIds);

      // Log warnings about protected partials
      for (const warning of protectedWarnings) {
        console.warn(warning);
      }

      // Log conflict resolutions
      for (const conflict of conflicts) {
        if (conflict.reason === 'last-wins') {
          console.log(
            `Conflict resolved: Using '${conflict.partialId}' from ${conflict.winner.packageName} ` +
            `(last in extends) over ${conflict.overridden.map(p => p.packageName).join(', ')}`
          );
        }
      }

      // Step 4: Sort partials by source index (maintains extends order)
      const sortedPartials = sortPartialsBySourceIndex(deduplicatedPartials);

      // Step 5: Merge partials into final content
      const mergedContent = await mergePartials(sortedPartials, {
        transformers: [...this.transformers, ...(options.transformers || [])],
        provider: options.provider,
      });

      // Step 6: Create metadata
      const packages = sortedPartials.reduce(
        (acc, partial) => {
          acc[partial.packageName] = partial.packageVersion;
          return acc;
        },
        {} as Record<string, string>
      );

      const metadata = createCompositionMetadata(
        packages,
        sortedPartials,
        protectedIds,
        mergedContent
      );

      // Step 7: Generate final output with metadata header
      const metadataHeader = generateMetadataHeader(metadata);
      const output = `${metadataHeader}

${mergedContent}`;

      return {
        content: output,
        metadata,
      };
    } catch (error) {
      throw new Error(
        `Composition failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate composition inputs (v2.0)
   */
  validateInputs(
    partials: PolicyPartial[],
    config: ManifestConfig
  ): CompositionError[] {
    const errors: CompositionError[] = [];

    // Check for duplicate IDs within same package
    const idsPerPackage = new Map<string, Set<string>>();

    for (const partial of partials) {
      if (!idsPerPackage.has(partial.packageName)) {
        idsPerPackage.set(partial.packageName, new Set());
      }

      const packageIds = idsPerPackage.get(partial.packageName)!;
      if (packageIds.has(partial.frontmatter.id)) {
        errors.push({
          message: `Duplicate partial ID '${partial.frontmatter.id}' in package ${partial.packageName}`,
          type: 'conflict',
          partialId: partial.frontmatter.id,
        });
      }

      packageIds.add(partial.frontmatter.id);
    }

    // Check that protected partials exist
    if (config.protected) {
      const allPartialIds = new Set(partials.map(p => p.frontmatter.id));
      for (const protectedId of config.protected) {
        if (!allPartialIds.has(protectedId)) {
          errors.push({
            message: `Protected partial '${protectedId}' not found in any package`,
            type: 'validation',
            partialId: protectedId,
          });
        }
      }
    }

    // Check that excluded partials exist (warning only)
    if (config.exclude) {
      const allPartialIds = new Set(partials.map(p => p.frontmatter.id));
      for (const excludeId of config.exclude) {
        if (!allPartialIds.has(excludeId)) {
          console.warn(`Warning: Excluded partial '${excludeId}' not found in any package`);
        }
      }
    }

    return errors;
  }
}

/**
 * Create a new composer instance
 */
export function createComposer(): PolicyComposer {
  return new PolicyComposer();
}

/**
 * Convenience function for simple composition (v2.0)
 */
export async function composePartials(
  partials: PolicyPartial[],
  config: ManifestConfig,
  provider: Provider,
  options: Partial<CompositionOptions> = {}
): Promise<CompositionResult> {
  const composer = createComposer();

  return composer.compose(partials, config, {
    provider,
    ...options,
  });
}
