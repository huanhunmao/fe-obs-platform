#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

const program = new Command();

program
  .name('feobs')
  .description('FE Observability platform CLI')
  .version('0.1.0');

program.command('plugin')
  .argument('<name>', 'plugin name')
  .description('scaffold a new SDK plugin')
  .action((name) => {
    const safe = String(name).replace(/[^a-zA-Z0-9_]/g, '');
    const dir = path.resolve(process.cwd(), `packages/sdk/src/plugins/${safe}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.ts'), `import type { Plugin } from '@fe/core';
export default function ${safe}(): Plugin {
  return {
    name: '${safe}',
    setup(ctx) { /* init */ },
    onEvent(evt, ctx) { /* handle */ },
    teardown() { /* cleanup */ },
  }
}
`);
    console.log('Created plugin at', dir);
  });

program.parse(process.argv);