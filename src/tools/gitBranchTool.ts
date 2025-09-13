import { Tool } from '../tool.js';
import { GitBranchInputSchema } from '../types.js';
import { spawnSync } from 'node:child_process';

function runGit(args: string[]) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(res.stderr || `git ${args.join(' ')} failed`);
  return res.stdout.trim();
}

export const gitBranchTool: Tool<typeof GitBranchInputSchema> = {
  name: 'git_branch',
  description: 'List, create, or checkout branches. action: list | create | checkout.',
  schema: GitBranchInputSchema,
  execute: ({ action, name }) => {
    switch (action) {
      case 'list':
        return runGit(['branch']);
      case 'create':
        if (!name) throw new Error('name required for create');
        runGit(['branch', name]);
        return `Created branch ${name}`;
      case 'checkout':
        if (!name) throw new Error('name required for checkout');
        runGit(['checkout', name]);
        return `Checked out ${name}`;
      default:
        throw new Error('unknown action');
    }
  }
};
