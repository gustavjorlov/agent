import { Tool } from '../tool.js';
import { GitMergeInputSchema } from '../types.js';
import { spawnSync } from 'node:child_process';

export const gitMergeTool: Tool<typeof GitMergeInputSchema> = {
  name: 'git_merge',
  description: 'Merge a branch into the current branch. Optionally force a merge commit with no_ff=true.',
  schema: GitMergeInputSchema,
  execute: ({ source, no_ff }) => {
    const args = ['merge'];
    if (no_ff) args.push('--no-ff');
    args.push(source);
    const res = spawnSync('git', args, { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(res.stderr || 'git merge failed');
    return res.stdout.slice(0, 8000) || 'Merge completed';
  }
};
