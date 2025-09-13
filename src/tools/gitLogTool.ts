import { Tool } from '../tool.js';
import { GitLogInputSchema } from '../types.js';
import { spawnSync } from 'node:child_process';

export const gitLogTool: Tool<typeof GitLogInputSchema> = {
  name: 'git_log',
  description: 'Show recent git commits with optional limit and oneline format.',
  schema: GitLogInputSchema,
  execute: ({ limit, oneline }) => {
    const args = ['log'];
    if (limit) args.push('-n', String(limit));
    if (oneline) args.push('--oneline');
    else args.push('--pretty=format:%h %ad %an %s', '--date=short');
    const res = spawnSync('git', args, { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || 'git log failed');
    return res.stdout.slice(0, 8000);
  }
};
