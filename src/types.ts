import { z } from 'zod';
import type { Tool } from './tools.js';

export interface ToolExecutionResult {
  id: string;
  type: 'tool_result';
  content: string;
  isError?: boolean;
  tool_use_id: string; // matches content.id from tool_use block
}

export interface AgentConfig {
  model: string;
  maxTokens: number;
  tools: Tool[];
}

export const ReadFileInputSchema = z.object({
  path: z.string().min(1).describe('The relative path of a file in the working directory.')
});
export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export const ListFilesInputSchema = z.object({
  path: z.string().optional().describe('Optional relative path to list files from. Defaults to current directory if not provided.')
});
export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;

export const EditFileInputSchema = z.object({
  path: z.string().min(1).describe('The path to the file'),
  old_str: z.string().describe('Text to search for - must match exactly and must only have one match exactly'),
  new_str: z.string().describe('Text to replace old_str with')
});
export type EditFileInput = z.infer<typeof EditFileInputSchema>;
