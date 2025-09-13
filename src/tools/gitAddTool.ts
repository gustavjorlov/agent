import { Tool } from "../tool.js";
import { GitAddInputSchema } from "../types.js";
import { spawn } from "node:child_process";

export const gitAddTool: Tool<typeof GitAddInputSchema> = {
  name: "git_add",
  description: "Add file(s) to the git staging area in preparation for commit.",
  schema: GitAddInputSchema,
  execute: async ({ paths }) => {
    const pathList = paths.split(/\s+/).filter(Boolean);
    
    if (pathList.length === 0) {
      throw new Error("No paths specified");
    }
    
    return await new Promise<string>((resolve, reject) => {
      const child = spawn("git", ["add", ...pathList], {
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
          reject(new Error(`git add failed (exit ${code}): ${err || out}`));
          return;
        }
        
        resolve(out || `Successfully added: ${paths}`);
      });
    });
  },
};