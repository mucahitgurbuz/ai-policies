import { getOctokit } from '@actions/github';
import type { RestEndpointMethodTypes } from '@octokit/rest';

type CreatePullRequestParams = RestEndpointMethodTypes['pulls']['create']['parameters'];
type PullRequestResponse = RestEndpointMethodTypes['pulls']['create']['response']['data'];

/**
 * GitHub API client for update bot operations
 */
export class GitHubClient {
  private octokit: ReturnType<typeof getOctokit>;

  constructor(token: string) {
    this.octokit = getOctokit(token);
  }

  /**
   * Check if a repository has AI Policies configuration
   */
  async hasAIPoliciesConfig(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.ai-policies.yaml',
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if a branch exists
   */
  async branchExists(owner: string, repo: string, branch: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Find repositories in an organization that have AI Policies
   */
  async findRepositoriesWithAIPolicies(organization: string): Promise<string[]> {
    const repositories: string[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.rest.repos.listForOrg({
        org: organization,
        type: 'all',
        per_page: perPage,
        page,
      });

      if (response.data.length === 0) {
        break;
      }

      // Check each repository for AI Policies configuration
      for (const repo of response.data) {
        try {
          const hasConfig = await this.hasAIPoliciesConfig(organization, repo.name);
          if (hasConfig) {
            repositories.push(`${organization}/${repo.name}`);
          }
        } catch (error) {
          // Skip repositories we can't access
          console.warn(`Could not check ${repo.name} for AI Policies config:`, error);
        }
      }

      page++;
    }

    return repositories;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<PullRequestResponse> {
    const response = await this.octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
      draft: params.draft || false,
    });

    return response.data;
  }

  /**
   * Request reviewers for a pull request
   */
  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    params: {
      reviewers?: string[];
      teamReviewers?: string[];
    }
  ): Promise<void> {
    if (params.reviewers?.length || params.teamReviewers?.length) {
      await this.octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: pullNumber,
        reviewers: params.reviewers || [],
        team_reviewers: params.teamReviewers || [],
      });
    }
  }

  /**
   * Add labels to a pull request
   */
  async addLabels(
    owner: string,
    repo: string,
    pullNumber: number,
    labels: string[]
  ): Promise<void> {
    if (labels.length > 0) {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels,
      });
    }
  }

  /**
   * Enable auto-merge for a pull request
   */
  async enableAutoMerge(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<void> {
    try {
      // Note: This requires the GraphQL API
      await this.octokit.graphql(`
        mutation(\$pullRequestId: ID!) {
          enablePullRequestAutoMerge(input: {
            pullRequestId: \$pullRequestId
            mergeMethod: MERGE
          }) {
            pullRequest {
              id
            }
          }
        }
      `, {
        pullRequestId: await this.getPullRequestNodeId(owner, repo, pullNumber),
      });
    } catch (error) {
      console.warn('Failed to enable auto-merge:', error);
      // Don't fail the entire action if auto-merge fails
    }
  }

  /**
   * Get pull request node ID for GraphQL operations
   */
  private async getPullRequestNodeId(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<string> {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return response.data.node_id;
  }

  /**
   * Get repository clone URL with authentication
   */
  getRepositoryUrl(owner: string, repo: string, token: string): string {
    return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  }

  /**
   * Get the default branch for a repository
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const response = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return response.data.default_branch;
  }
}
