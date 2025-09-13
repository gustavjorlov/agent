import fs from "node:fs";
import { ReadFileInputSchema } from "../types.js";
import { Tool } from "../tool.js";

/**
 * The readFileTool is responsible for reading the contents of a specified file.
 * It takes a relative file path as input, reads the file synchronously,
 * and returns its contents as a UTF-8 encoded string.
 * This tool should only be used with files and not with directory paths.
 */
export const readFileTool: Tool<typeof ReadFileInputSchema> = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  schema: ReadFileInputSchema,
  execute: ({ path: p }) => {
    const content = fs.readFileSync(p, "utf8");
    return content;
  },
};
