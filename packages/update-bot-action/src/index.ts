import * as core from '@actions/core';
import { runUpdateBot } from './action.js';

/**
 * Main entry point for the GitHub Action
 */
async function run(): Promise<void> {
  try {
    await runUpdateBot();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(\`Action failed: \${message}\`);
  }
}

// Only run if this file is executed directly (not imported)
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  run().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
