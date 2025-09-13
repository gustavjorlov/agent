import fs from "node:fs";
import path from "node:path";
import { ListFilesInputSchema } from "../types.js";
import { Tool } from "../tool.js";

export const listFilesTool: Tool<typeof ListFilesInputSchema> = {
  name: "list_files",
  description:
    "List files and directories at a given path. If no path is provided, lists files in the current directory.",
  schema: ListFilesInputSchema,
  execute: ({ path: p }) => {
    const dir = p && p.length ? p : ".";
    const entries: string[] = [];
    function walk(current: string, root: string) {
      const stats = fs.statSync(current);
      if (!stats.isDirectory()) return;
      for (const e of fs.readdirSync(current)) {
        const full = path.join(current, e);
        const rel = path.relative(root, full) || ".";
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          entries.push(rel + "/");
        } else {
          entries.push(rel);
        }
      }
    }
    walk(dir, dir);
    return JSON.stringify(entries);
  },
};
