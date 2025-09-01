#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';
import { updateCommand } from './commands/update.js';
import { doctorCommand } from './commands/doctor.js';
import { validateCommand } from './commands/validate.js';

export async function main() {
  await yargs(hideBin(process.argv))
    .scriptName('ai-policies')
    .usage('$0 <command> [options]')
    .command(initCommand)
    .command(syncCommand)
    .command(diffCommand)
    .command(updateCommand)
    .command(doctorCommand)
    .command(validateCommand)
    .demandCommand(1, 'You must specify a command')
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')
    .parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
