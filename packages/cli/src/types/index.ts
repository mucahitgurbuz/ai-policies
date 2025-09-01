export interface ManifestConfig {
  requires: Record<string, string>;
  output: {
    cursor?: string;
    copilot?: string;
  };
  compose: {
    order: string[];
    protectedLayers: string[];
    teamAppend: boolean;
  };
}

export interface PolicyPartial {
  id: string;
  layer: 'core' | 'domain' | 'stack' | 'team';
  weight: number;
  protected: boolean;
  dependsOn: string[];
  owner: string;
  content: string;
  filePath: string;
}

export interface PolicyPackage {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  partials: PolicyPartial[];
}

export interface CompositionResult {
  content: string;
  metadata: {
    packages: Record<string, string>;
    contentHash: string;
    generatedAt: string;
  };
}

export interface CliOptions {
  verbose?: boolean;
  dry?: boolean;
  force?: boolean;
}
