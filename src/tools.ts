// tools.ts
// Implements the tool abstraction & concrete tools translating the Go article's
// read_file, list_files, and edit_file examples into TypeScript. Each Tool:
//  - Exposes metadata (name, description, zod schema)
//  - Provides an execute() function returning a string result
// We also supply a minimal zod->JSON schema transformer sufficient for Anthropic's
// tool schema (only simple string props used here).
import { z } from "zod";
import { readFileTool } from "./tools/readFileTool.js";
import { listFilesTool } from "./tools/listFilesTool.js";
import { editFileTool } from "./tools/editFileTool.js";
import { Tool } from "./tool.js";

function jsonSchemaFromZod(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = (schema as any)._def.shape();
    const properties: Record<string, any> = {};
    for (const [k, v] of Object.entries(shape)) {
      const def: any = (v as any)._def;
      const prop: any = { type: "string" };
      if (def.description) prop.description = def.description;
      properties[k] = prop;
    }
    return { type: "object", properties, additionalProperties: false };
  }
  return { type: "object", properties: {} };
}

// (Tool implementations moved to separate files in ./tools/*)

// Convert internal Tool representation to Anthropic tool schema structure.
export function toAnthropicTool(tool: Tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchemaFromZod(tool.schema),
  } as const;
}

// Export default tool registry used by Agent if none supplied
export const defaultTools: Tool[] = [readFileTool, listFilesTool, editFileTool];
