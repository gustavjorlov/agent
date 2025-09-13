import { Tool } from "../tool.js";
import { GitCommitInputSchema } from "../types.js";
import { spawn } from "node:child_process";

export const gitCommitTool: Tool<typeof GitCommitInputSchema> = {
  name: "git_commit",
  description: "Commit staged changes to the git repository with the specified message.",
  schema: GitCommitInputSchema,
  execute: async ({ message }) => {
    if (!message || message.trim() === "") {
      throw new Error("Commit message cannot be empty");
    }
    
    return await new Promise<string>((resolve, reject) => {
      const child = spawn("git", ["commit", "-m", message], {
        cwd: process.cwd(),
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
          reject(new Error(`git commit failed (exit ${code}): ${err || out}`));
          return;
        }
        
        resolve(out || `Successfully committed with message: ${message}`);
      });
    });
  },
};