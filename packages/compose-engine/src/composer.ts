import type {
  PolicyPartial,
  ManifestConfig,
  CompositionResult,
  Provider
} from '@ai-policies/core-schemas';
import {
  shouldIncludePartialForProvider,
  createCompositionMetadata,
  generateMetadataHeader
} from '@ai-policies/core-schemas';

import type {
  CompositionOptions,
  CompositionError,
  ContentTransformer
} from './types.js';
import { resolveDependencies } from './resolver.js';
import { mergePartials } from './merger.js';
import { extractProtectedBlocks, mergeProtectedBlocks } from './protected-blocks.js';
import { sortPartialsByComposition, deduplicatePartials } from './utils.js';

/**
 * Main composition engine
 */
export class PolicyComposer {
  private transformers: ContentTransformer[] = [];

  constructor() {
    // Add default transformers
    this.addTransformer({
      name: 'remove-empty-lines',
      priority: 100,
      transform: (content) => content.replace(/\n\s*\n\s*\n/g, '\n\n'),
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
   * Compose policies into a single output
   */
  async compose(
    partials: PolicyPartial[],
    config: ManifestConfig,
    options: CompositionOptions
  ): Promise<CompositionResult> {
    const errors: CompositionError[] = [];

    try {
      // Step 1: Filter partials for the target provider
      const filteredPartials = partials.filter(partial =>
        shouldIncludePartialForProvider(partial.frontmatter, options.provider)
      );

      // Step 2: Exclude specified partials
      const includedPartials = filteredPartials.filter(partial =>
        !options.excludePartials?.includes(partial.frontmatter.id)
      );

      // Step 3: Deduplicate partials (same ID from different packages)
      const { partials: deduplicatedPartials, conflicts } = deduplicatePartials(
        includedPartials
      );

      // Log conflicts as warnings (use proper logger if available)
      if (conflicts.length > 0 && options.debug) {
        for (const conflict of conflicts) {
          console.warn(\`Conflict resolved: Using \${conflict.winner.frontmatter.id} from \${conflict.winner.packageName} over \${conflict.losers.map(l => l.packageName).join(', ')}\`);
        }
      }

      // Step 4: Resolve dependencies
      const dependencyResult = resolveDependencies(deduplicatedPartials);

      if (dependencyResult.circular.length > 0) {
        errors.push({
          message: \`Circular dependencies detected: \${dependencyResult.circular.map(c => c.join(' -> ')).join(', ')}\`,
          type: 'circular',
        });
      }

      if (dependencyResult.missing.length > 0) {
        for (const missing of dependencyResult.missing) {
          errors.push({
            message: \`Missing dependencies for \${missing.partialId}: \${missing.missingDeps.join(', ')}\`,
            type: 'dependency',
            partialId: missing.partialId,
          });
        }
      }

      if (errors.length > 0 && !options.debug) {
        throw new Error(\`Composition failed: \${errors.map(e => e.message).join('; ')}\`);
      }

      // Step 5: Sort partials by composition rules
      const sortedPartials = sortPartialsByComposition(
        dependencyResult.resolved,
        config.compose
      );

      // Step 6: Extract protected blocks from existing content
      // (This would read from existing files in a real implementation)
      const protectedBlocks = await extractProtectedBlocks('', config.compose.protectedLayers);

      // Step 7: Merge partials into final content
      const mergedContent = await mergePartials(
        sortedPartials,
        config.compose,
        {
          teamAppendContent: options.teamAppendContent,
          transformers: [...this.transformers, ...(options.transformers || [])],
          provider: options.provider,
        }
      );

      // Step 8: Apply protected blocks
      const finalContent = mergeProtectedBlocks(mergedContent, protectedBlocks);

      // Step 9: Create metadata
      const packages = sortedPartials.reduce((acc, partial) => {
        acc[partial.packageName] = partial.packageVersion;
        return acc;
      }, {} as Record<string, string>);

      const metadata = createCompositionMetadata(
        packages,
        sortedPartials,
        config.compose,
        finalContent
      );

      // Step 10: Generate final output with metadata header
      const metadataHeader = generateMetadataHeader(metadata);
      const output = \`\${metadataHeader}

\${finalContent}\`;

      return {
        content: output,
        metadata,
      };

    } catch (error) {
      throw new Error(\`Composition failed: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }

  /**
   * Validate composition inputs
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
          message: \`Duplicate partial ID '\${partial.frontmatter.id}' in package \${partial.packageName}\`,
          type: 'conflict',
          partialId: partial.frontmatter.id,
        });
      }

      packageIds.add(partial.frontmatter.id);
    }

    // Validate layer ordering
    const orderSet = new Set(config.compose.order);
    for (const partial of partials) {
      if (!orderSet.has(partial.frontmatter.layer)) {
        errors.push({
          message: \`Partial '\${partial.frontmatter.id}' has layer '\${partial.frontmatter.layer}' which is not in compose.order\`,
          type: 'validation',
          partialId: partial.frontmatter.id,
        });
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
 * Convenience function for simple composition
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
