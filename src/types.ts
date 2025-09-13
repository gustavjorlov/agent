// types.ts
// Centralized type & schema definitions that mirror the Go article's
// struct & JSON schema generation. We use Zod to:
// 1. Validate tool inputs prior to execution
// 2. Provide (lightweight) metadata we later transform to Anthropic tool JSON schema
// Keeping schemas here keeps tool code focused on behavior.
import { z } from 'zod';
import type { Tool } from './tools.js';

// ToolExecutionResult represents what we send back to Claude after running a tool.
// (Currently unused directly—agent builds the structure inline—but kept for clarity/extension.)
export interface ToolExecutionResult {
  id: string;              // local identifier (not strictly required by Anthropic SDK)
  type: 'tool_result';     // constant discriminator
  content: string;         // textual result payload
  isError?: boolean;       // whether execution failed
  tool_use_id: string;     // correlates with the tool_use block id from model output
}

// AgentConfig centralizes runtime configuration for the Agent class.
export interface AgentConfig {
  model: string;       // Anthropic model name
  maxTokens: number;   // max tokens per completion
  tools: Tool[];       // list of registered tools
}

// read_file tool input: single required path
export const ReadFileInputSchema = z.object({
  path: z.string().min(1).describe('The relative path of a file in the working directory.')
});
export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

// list_files tool input: optional path (defaults to current directory)
export const ListFilesInputSchema = z.object({
  path: z.string().optional().describe('Optional relative path to list files from. Defaults to current directory if not provided.')
});
export type ListFilesInput = z.infer<typeof ListFilesInputSchema>;

// edit_file tool input: file path + old/new string pair for replacement.
// old_str may be empty to signal file creation (matching the article's semantics).
export const EditFileInputSchema = z.object({
  path: z.string().min(1).describe('The path to the file'),
  old_str: z.string().describe('Text to search for - must match exactly and must only have one match exactly'),
  new_str: z.string().describe('Text to replace old_str with')
});
export type EditFileInput = z.infer<typeof EditFileInputSchema>;
