import * as core from '@actions/core';
import { context } from '@actions/github';

import { GitHubClient } from './github-api.js';
import { GitOperations } from './git-operations.js';
import {
  parseRepositoryList,
  validateInputs,
  formatPullRequestBody,
} from './utils.js';

export interface ActionInputs {
  token: string;
  repositories: string[];
  organization: string;
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  autoMerge: boolean;
  reviewers: string[];
  teamReviewers: string[];
  labels: string[];
  dryRun: boolean;
}

export interface ActionResults {
  repositoriesUpdated: number;
  pullRequestsCreated: string[];
  repositoriesSkipped: string[];
  errors: string[];
}

/**
 * Main action logic
 */
export async function runUpdateBot(): Promise<void> {
  const inputs = getActionInputs();
  validateInputs(inputs);

  core.info('🤖 Starting AI Policies Update Bot...');

  if (inputs.dryRun) {
    core.info('🔍 Running in dry-run mode - no actual changes will be made');
  }

  const results: ActionResults = {
    repositoriesUpdated: 0,
    pullRequestsCreated: [],
    repositoriesSkipped: [],
    errors: [],
  };

  const github = new GitHubClient(inputs.token);
  const git = new GitOperations();

  try {
    // Get target repositories
    const targetRepos = await getTargetRepositories(github, inputs);
    core.info(`Found ${targetRepos.length} target repositories`);

    // Process each repository
    for (const repo of targetRepos) {
      try {
        core.info(`Processing repository: ${repo}`);

        const updateResult = await processRepository(github, git, repo, inputs);

        if (updateResult.updated) {
          results.repositoriesUpdated++;
          if (updateResult.pullRequestUrl) {
            results.pullRequestsCreated.push(updateResult.pullRequestUrl);
          }
        } else {
          results.repositoriesSkipped.push(repo);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.error(`Failed to process ${repo}: ${message}`);
        results.errors.push(`${repo}: ${message}`);
      }
    }

    // Set outputs
    core.setOutput(
      'repositories-updated',
      results.repositoriesUpdated.toString()
    );
    core.setOutput(
      'pull-requests-created',
      results.pullRequestsCreated.join('\\n')
    );
    core.setOutput(
      'repositories-skipped',
      results.repositoriesSkipped.join('\\n')
    );
    core.setOutput('errors', results.errors.join('\\n'));

    // Summary
    core.info(`✅ Update bot completed:`);
    core.info(`  - Repositories updated: ${results.repositoriesUpdated}`);
    core.info(
      `  - Pull requests created: ${results.pullRequestsCreated.length}`
    );
    core.info(
      `  - Repositories skipped: ${results.repositoriesSkipped.length}`
    );
    core.info(`  - Errors: ${results.errors.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Update bot failed: ${message}`);
    throw error;
  }
}

/**
 * Get action inputs from environment
 */
function getActionInputs(): ActionInputs {
  return {
    token: core.getInput('token', { required: true }),
    repositories: parseRepositoryList(core.getInput('repositories')),
    organization: core.getInput('organization'),
    branchName: core.getInput('branch-name') || 'ai-policies/auto-update',
    commitMessage:
      core.getInput('commit-message') ||
      'chore: update AI Policies configurations',
    prTitle:
      core.getInput('pr-title') || 'chore: update AI Policies configurations',
    prBody: core.getInput('pr-body') || 'Automated AI Policies update',
    autoMerge: core.getBooleanInput('auto-merge'),
    reviewers: core
      .getInput('reviewers')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean),
    teamReviewers: core
      .getInput('team-reviewers')
      .split(',')
      .map(r => r.trim())
      .filter(Boolean),
    labels: core
      .getInput('labels')
      .split(',')
      .map(l => l.trim())
      .filter(Boolean),
    dryRun: core.getBooleanInput('dry-run'),
  };
}

/**
 * Get target repositories to update
 */
async function getTargetRepositories(
  github: GitHubClient,
  inputs: ActionInputs
): Promise<string[]> {
  if (inputs.repositories.length > 0) {
    // Use explicitly provided repositories
    return inputs.repositories;
  }

  if (inputs.organization) {
    // Search for repositories in organization with AI Policies
    return github.findRepositoriesWithAIPolicies(inputs.organization);
  }

  // Fallback to current repository
  const currentRepo = `${context.repo.owner}/${context.repo.repo}`;
  core.warning(
    `No repositories or organization specified, using current repo: ${currentRepo}`
  );
  return [currentRepo];
}

/**
 * Process a single repository
 */
async function processRepository(
  github: GitHubClient,
  git: GitOperations,
  repository: string,
  inputs: ActionInputs
): Promise<{ updated: boolean; pullRequestUrl?: string }> {
  const [owner, repo] = repository.split('/');

  // Check if repository has AI Policies configuration
  const hasConfig = await github.hasAIPoliciesConfig(owner, repo);
  if (!hasConfig) {
    core.info(`Skipping ${repository} - no AI Policies configuration found`);
    return { updated: false };
  }

  // Check if update branch already exists
  const branchExists = await github.branchExists(
    owner,
    repo,
    inputs.branchName
  );
  if (branchExists) {
    core.info(`Skipping ${repository} - update branch already exists`);
    return { updated: false };
  }

  if (inputs.dryRun) {
    core.info(`[DRY RUN] Would update repository: ${repository}`);
    return { updated: true };
  }

  // Clone repository and create update branch
  const workingDir = await git.cloneRepository(
    github.getRepositoryUrl(owner, repo, inputs.token),
    inputs.branchName
  );

  try {
    // Run AI Policies sync
    const hasChanges = await git.runAIPoliciesSync(workingDir);

    if (!hasChanges) {
      core.info(`No changes needed for ${repository}`);
      return { updated: false };
    }

    // Commit and push changes
    await git.commitAndPush(
      workingDir,
      inputs.commitMessage,
      inputs.branchName
    );

    // Create pull request
    const prBody = formatPullRequestBody(inputs.prBody, {
      repository,
      branch: inputs.branchName,
      timestamp: new Date().toISOString(),
    });

    const pullRequest = await github.createPullRequest({
      owner,
      repo,
      title: inputs.prTitle,
      body: prBody,
      head: inputs.branchName,
      base: 'main', // TODO: detect default branch
      draft: false,
    });

    // Add reviewers and labels if specified
    if (inputs.reviewers.length > 0 || inputs.teamReviewers.length > 0) {
      await github.requestReviewers(owner, repo, pullRequest.number, {
        reviewers: inputs.reviewers,
        teamReviewers: inputs.teamReviewers,
      });
    }

    if (inputs.labels.length > 0) {
      await github.addLabels(owner, repo, pullRequest.number, inputs.labels);
    }

    // Enable auto-merge if requested
    if (inputs.autoMerge) {
      await github.enableAutoMerge(owner, repo, pullRequest.number);
    }

    core.info(
      `✅ Created pull request for ${repository}: ${pullRequest.html_url}`
    );

    return {
      updated: true,
      pullRequestUrl: pullRequest.html_url,
    };
  } finally {
    // Clean up working directory
    await git.cleanup(workingDir);
  }
}
