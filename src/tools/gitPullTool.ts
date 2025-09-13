import { Tool } from '../tool.js';
import { GitPullInputSchema } from '../types.js';
import { spawnSync } from 'node:child_process';

export const gitPullTool: Tool<typeof GitPullInputSchema> = {
  name: 'git_pull',
  description: 'Pull latest changes from a remote (default origin) and optional branch.',
  schema: GitPullInputSchema,
  execute: ({ remote, branch }) => {
    const args = ['pull'];
    if (remote) args.push(remote);
    if (branch) args.push(branch);
    const res = spawnSync('git', args, { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || 'git pull failed');
    return res.stdout.slice(0, 8000) || 'Pull completed';
  }
};
