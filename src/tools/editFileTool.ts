import fs from "node:fs";
import path from "node:path";
import { EditFileInputSchema } from "../types.js";
import { Tool } from "../tool.js";

function ensureDir(dir: string) {
  if (dir === "." || dir === "") return;
  fs.mkdirSync(dir, { recursive: true });
}

export const editFileTool: Tool<typeof EditFileInputSchema> = {
  name: "edit_file",
  description: `Make edits to a text file.\n\nReplaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other.\n\nIf the file specified with path doesn't exist, it will be created.`,
  schema: EditFileInputSchema,
  execute: ({ path: filePath, old_str, new_str }) => {
    if (!filePath || old_str === new_str) {
      throw new Error("invalid input parameters");
    }
    if (!fs.existsSync(filePath)) {
      if (old_str !== "")
        throw new Error("file does not exist and old_str not empty");
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, new_str, "utf8");
      return `Successfully created file ${filePath}`;
    }
    const original = fs.readFileSync(filePath, "utf8");
    const replaced = original.split(old_str).join(new_str);
    if (replaced === original && old_str !== "") {
      throw new Error("old_str not found in file");
    }
    fs.writeFileSync(filePath, replaced, "utf8");
    return "OK";
  },
};
