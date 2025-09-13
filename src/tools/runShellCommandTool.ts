import { Tool } from "../tool.js";
import { RunShellCommandInputSchema } from "../types.js";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// Whitelisted binaries (add more cautiously)
const WHITELIST = new Set([
  "ls",
  "cat",
  "echo",
  "grep",
  "head",
  "tail",
  "node",
  "tsc",
  "npm",
  "npx",
  "git",
]);

// Execute a command safely within current workspace directory tree.
export const runShellCommandTool: Tool<typeof RunShellCommandInputSchema> = {
  name: "run_shell_command",
  description:
    "Execute a whitelisted shell command (non-interactive) restricted to files under current working directory.",
  schema: RunShellCommandInputSchema,
  execute: async ({ cmd, args }) => {
    if (!WHITELIST.has(cmd)) {
      throw new Error(`command not allowed: ${cmd}`);
    }
    const cwd = process.cwd();
    const argList = args ? args.split(/\s+/).filter(Boolean) : [];

    // Validate any path-looking args stay inside cwd
    for (const a of argList) {
      if (a.startsWith("-")) continue; // option
      // crude heuristic: treat as path if it contains / or exists
      if (a.includes("/") || fs.existsSync(a)) {
        const abs = path.resolve(cwd, a);
        if (!abs.startsWith(cwd)) {
          throw new Error(`path escapes workspace: ${a}`);
        }
      }
    }

    return await new Promise<string>((resolve, reject) => {
      const child = spawn(cmd, argList, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      child.stdout.on("data", (d) => stdoutChunks.push(Buffer.from(d)));
      child.stderr.on("data", (d) => stderrChunks.push(Buffer.from(d)));
      child.on("error", (e) => reject(e));
      child.on("close", (code) => {
        const out = stdoutChunks.length
          ? Buffer.concat(stdoutChunks).toString("utf8")
          : "";
        const err = stderrChunks.length
          ? Buffer.concat(stderrChunks).toString("utf8")
          : "";
        if (code !== 0) {
          reject(new Error(`exit ${code}: ${err || out}`));
          return;
        }
        // Truncate output to a reasonable length to avoid flooding model
        const combined = out || err;
        const MAX = 8000; // characters
        resolve(
          combined.length > MAX
            ? combined.slice(0, MAX) + "...<truncated>"
            : combined
        );
      });
    });
  },
};
