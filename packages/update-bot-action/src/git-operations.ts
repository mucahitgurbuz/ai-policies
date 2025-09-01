import * as core from '@actions/core';
import { simpleGit, SimpleGit } from 'simple-git';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Git operations for the update bot
 */
export class GitOperations {
  private tempDirs: string[] = [];

  /**
   * Clone a repository and create a new branch
   */
  async cloneRepository(repositoryUrl: string, branchName: string): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-policies-update-'));
    this.tempDirs.push(tempDir);

    core.info(\`Cloning repository to \${tempDir}\`);

    const git = simpleGit();

    try {
      // Clone the repository
      await git.clone(repositoryUrl, tempDir, ['--depth', '1']);

      // Configure git in the cloned repository
      const repoGit = simpleGit(tempDir);
      await repoGit.addConfig('user.name', 'AI Policies Bot');
      await repoGit.addConfig('user.email', 'ai-policies-bot@users.noreply.github.com');

      // Create and checkout new branch
      await repoGit.checkoutLocalBranch(branchName);

      core.info(\`Created branch: \${branchName}\`);

      return tempDir;
    } catch (error) {
      // Clean up on error
      await this.cleanup(tempDir);
      throw error;
    }
  }

  /**
   * Run AI Policies sync in the repository
   */
  async runAIPoliciesSync(workingDir: string): Promise<boolean> {
    core.info('Running ai-policies sync...');

    try {
      // Check if .ai-policies.yaml exists
      const manifestPath = path.join(workingDir, '.ai-policies.yaml');
      if (!await fs.pathExists(manifestPath)) {
        throw new Error('No .ai-policies.yaml found in repository');
      }

      // Get git status before sync
      const git = simpleGit(workingDir);
      const statusBefore = await git.status();

      // Run ai-policies sync
      // In a real implementation, this would use the actual CLI
      // For now, we'll simulate the sync operation
      await this.simulateSync(workingDir);

      // Check if there are changes after sync
      const statusAfter = await git.status();

      const hasChanges = statusAfter.files.length > statusBefore.files.length ||
        statusAfter.modified.length > 0 ||
        statusAfter.created.length > 0 ||
        statusAfter.deleted.length > 0;

      if (hasChanges) {
        core.info('Changes detected after sync');

        // Log the changes
        for (const file of statusAfter.files) {
          core.info(\`  \${file.working_dir === 'M' ? 'Modified' : file.working_dir === 'A' ? 'Added' : 'Deleted'}: \${file.path}\`);
        }
      } else {
        core.info('No changes detected after sync');
      }

      return hasChanges;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(\`Failed to run AI Policies sync: \${message}\`);
    }
  }

  /**
   * Commit and push changes
   */
  async commitAndPush(
    workingDir: string,
    commitMessage: string,
    branchName: string
  ): Promise<void> {
    const git = simpleGit(workingDir);

    try {
      // Add all changes
      await git.add('.');

      // Commit changes
      await git.commit(commitMessage);
      core.info(\`Committed changes: \${commitMessage}\`);

      // Push branch
      await git.push('origin', branchName);
      core.info(\`Pushed branch: \${branchName}\`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(\`Failed to commit and push: \${message}\`);
    }
  }

  /**
   * Clean up temporary directories
   */
  async cleanup(workingDir?: string): Promise<void> {
    if (workingDir) {
      try {
        await fs.remove(workingDir);
        core.info(\`Cleaned up working directory: \${workingDir}\`);
      } catch (error) {
        core.warning(\`Failed to clean up \${workingDir}: \${error}\`);
      }
    }

    // Clean up all tracked temp directories
    for (const tempDir of this.tempDirs) {
      try {
        if (await fs.pathExists(tempDir)) {
          await fs.remove(tempDir);
        }
      } catch (error) {
        core.warning(\`Failed to clean up temp directory \${tempDir}: \${error}\`);
      }
    }

    this.tempDirs = [];
  }

  /**
   * Simulate AI Policies sync (placeholder implementation)
   */
  private async simulateSync(workingDir: string): Promise<void> {
    // This is a placeholder implementation
    // In the real implementation, this would:
    // 1. Install ai-policies CLI if not available
    // 2. Run 'ai-policies sync' command
    // 3. Handle any errors appropriately

    const cursorRulesPath = path.join(workingDir, '.cursorrules');
    const copilotDir = path.join(workingDir, '.copilot');
    const copilotPath = path.join(copilotDir, 'instructions.md');

    // Simulate generating .cursorrules
    const cursorContent = \`# AI Assistant Rules

## Core Safety Rules
- Never expose API keys or sensitive data
- Always validate user input
- Use secure coding practices

## Code Quality
- Write clean, readable code
- Follow established patterns
- Include appropriate tests

<!-- Generated by AI Policies at \${new Date().toISOString()} -->
\`;

    await fs.writeFile(cursorRulesPath, cursorContent);

    // Simulate generating .copilot/instructions.md
    const copilotContent = \`# GitHub Copilot Instructions

## Security Requirements
- Never include hardcoded secrets
- Always validate inputs
- Use parameterized queries

## Code Style
- Follow project conventions
- Write clear, documented code
- Include error handling

<!-- Generated by AI Policies at \${new Date().toISOString()} -->
\`;

    await fs.ensureDir(copilotDir);
    await fs.writeFile(copilotPath, copilotContent);

    core.info('Generated AI Policies configurations');
  }
}
