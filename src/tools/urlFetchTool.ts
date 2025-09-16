import { Tool } from "../tool.js";
import { WebSearchInputSchema as UrlFetchInputSchema } from "../types.js";
import https from "node:https";
import http from "node:http";
import { URL } from "node:url";

export const urlFetchTool: Tool<typeof UrlFetchInputSchema> = {
  name: "url_fetch",
  description: "Fetch the contents of a URL over HTTP(S) and return the raw response body as text (HTML or plain). 10s timeout.",
  schema: UrlFetchInputSchema,
  execute: async ({ url }) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    return await new Promise<string>((resolve, reject) => {
      const req = mod.get(u, (res) => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`request failed: ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy(new Error('request timeout'));
      });
    });
  },
};
