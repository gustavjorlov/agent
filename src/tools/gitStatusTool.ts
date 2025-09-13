import { Tool } from '../tool.js';
import { GitStatusInputSchema } from '../types.js';
import { spawnSync } from 'node:child_process';

export const gitStatusTool: Tool<typeof GitStatusInputSchema> = {
  name: 'git_status',
  description: 'Show git working tree status. Optional porcelain mode for parseable output.',
  schema: GitStatusInputSchema,
  execute: ({ porcelain }) => {
    const args = ['status'];
    if (porcelain) args.push('--porcelain');
    const res = spawnSync('git', args, { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || 'git status failed');
    const out = res.stdout.trim();
    return out.slice(0, 8000);
  }
};
