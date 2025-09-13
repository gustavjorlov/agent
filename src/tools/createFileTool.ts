import fs from 'node:fs';
import path from 'node:path';
import { CreateFileInputSchema } from '../types.js';
import { Tool } from '../tool.js';

function ensureDir(dir: string) {
  if (dir === '.' || dir === '') return;
  fs.mkdirSync(dir, { recursive: true });
}

export const createFileTool: Tool<typeof CreateFileInputSchema> = {
  name: 'create_file',
  description: 'Create a new text file with provided content. Fails if file exists unless overwrite=true.',
  schema: CreateFileInputSchema,
  execute: ({ path: filePath, content, overwrite }) => {
    if (!filePath) throw new Error('path required');
    const exists = fs.existsSync(filePath);
    if (exists && !overwrite) {
      throw new Error('file already exists (specify overwrite=true to replace)');
    }
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content ?? '', 'utf8');
    return exists ? 'OVERWRITTEN' : 'CREATED';
  }
};
