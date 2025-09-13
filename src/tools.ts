import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ReadFileInputSchema, ListFilesInputSchema, EditFileInputSchema } from './types.js';

export interface Tool<InputSchema extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  schema: InputSchema;
  execute: (input: z.infer<InputSchema>) => Promise<string> | string;
}

function jsonSchemaFromZod(schema: z.ZodTypeAny): any {
  // Minimal conversion for object properties only (enough for this demo)
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = (schema as any)._def.shape();
    const properties: Record<string, any> = {};
    for (const [k, v] of Object.entries(shape)) {
      const def: any = (v as any)._def;
      const prop: any = { type: 'string' };
      if (def.description) prop.description = def.description;
      properties[k] = prop;
    }
    return { type: 'object', properties, additionalProperties: false };
  }
  return { type: 'object', properties: {} };
}

export const readFileTool: Tool<typeof ReadFileInputSchema> = {
  name: 'read_file',
  description: 'Read the contents of a given relative file path. Use this when you want to see what\'s inside a file. Do not use this with directory names.',
  schema: ReadFileInputSchema,
  execute: ({ path: p }) => {
    const content = fs.readFileSync(p, 'utf8');
    return content;
  }
};

export const listFilesTool: Tool<typeof ListFilesInputSchema> = {
  name: 'list_files',
  description: 'List files and directories at a given path. If no path is provided, lists files in the current directory.',
  schema: ListFilesInputSchema,
  execute: ({ path: p }) => {
    const dir = p && p.length ? p : '.';
    const entries: string[] = [];
    function walk(current: string, root: string) {
      const stats = fs.statSync(current);
      if (!stats.isDirectory()) return;
      for (const e of fs.readdirSync(current)) {
        const full = path.join(current, e);
        const rel = path.relative(root, full) || '.';
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          entries.push(rel + '/');
        } else {
            entries.push(rel);
        }
      }
    }
    walk(dir, dir);
    return JSON.stringify(entries);
  }
};

export const editFileTool: Tool<typeof EditFileInputSchema> = {
  name: 'edit_file',
  description: `Make edits to a text file.\n\nReplaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other.\n\nIf the file specified with path doesn't exist, it will be created.`,
  schema: EditFileInputSchema,
  execute: ({ path: filePath, old_str, new_str }) => {
    if (!filePath || old_str === new_str) {
      throw new Error('invalid input parameters');
    }
    if (!fs.existsSync(filePath)) {
      if (old_str !== '') throw new Error('file does not exist and old_str not empty');
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, new_str, 'utf8');
      return `Successfully created file ${filePath}`;
    }
    const original = fs.readFileSync(filePath, 'utf8');
    const replaced = original.split(old_str).join(new_str);
    if (replaced === original && old_str !== '') {
      throw new Error('old_str not found in file');
    }
    fs.writeFileSync(filePath, replaced, 'utf8');
    return 'OK';
  }
};

function ensureDir(dir: string) {
  if (dir === '.' || dir === '') return;
  fs.mkdirSync(dir, { recursive: true });
}

export function toAnthropicTool(tool: Tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchemaFromZod(tool.schema)
  } as const;
}

export const defaultTools: Tool[] = [readFileTool, listFilesTool, editFileTool];
