import 'dotenv/config';
import { Agent } from './agent.js';

const model = process.env.MODEL || 'claude-3-7-sonnet-20250219';
const maxTokens = parseInt(process.env.MAX_TOKENS || '1024', 10);

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY in environment');
    process.exit(1);
  }
  const agent = new Agent({ model, maxTokens });
  await agent.run();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
