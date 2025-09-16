// index.ts
// Entry point: loads env, constructs Agent with configured model & runs loop.
// Mirrors the Go main.go in the article.
// Refactored: export a function that runs the agent given a config object.
// Environment loading & validation now happen in the CLI layer (src/cli.ts).
import { Agent } from './agent.js';

export interface RunAgentConfig {
  model: string;
  maxTokens: number;
}

export async function runAgent(cfg: RunAgentConfig) {
  const agent = new Agent({ model: cfg.model, maxTokens: cfg.maxTokens });
  await agent.run();
}
