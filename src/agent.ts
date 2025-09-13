import Anthropic from '@anthropic-ai/sdk';
import readline from 'node:readline';
import { defaultTools, toAnthropicTool, Tool } from './tools.js';
import { z } from 'zod';

interface AgentOptions {
  model: string;
  maxTokens: number;
  tools?: Tool[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: any;
}

export class Agent {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private tools: Tool[];

  constructor(opts: AgentOptions) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = opts.model;
    this.maxTokens = opts.maxTokens;
    this.tools = opts.tools ?? defaultTools;
  }

  async run() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

    console.log('Chat with Claude (ctrl-c to quit)');
    const conversation: ConversationMessage[] = [];

    let readUserInput = true;
    while (true) {
      if (readUserInput) {
        const userInput = await ask('\u001b[94mYou\u001b[0m: ');
        if (!userInput) continue;
        conversation.push({ role: 'user', content: [{ type: 'text', text: userInput }] });
      }

      const message = await this.infer(conversation);
      conversation.push({ role: 'assistant', content: message.content });

      const toolResults: any[] = [];
      for (const block of message.content) {
        if (block.type === 'text') {
          console.log(`\u001b[93mClaude\u001b[0m: ${block.text}`);
        } else if (block.type === 'tool_use') {
            const result = await this.executeTool(block);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: [{ type: 'text', text: result.result }],
              is_error: result.isError
            });
        }
      }

      if (toolResults.length === 0) {
        readUserInput = true;
        continue;
      }

      readUserInput = false;
      conversation.push({ role: 'user', content: toolResults });
    }
  }

  private async infer(conversation: ConversationMessage[]) {
    const toolsForAnthropic = this.tools.map(t => toAnthropicTool(t));
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: conversation.map(m => ({ role: m.role, content: m.content })),
      tools: toolsForAnthropic
    });
    return response;
  }

  private async executeTool(block: any): Promise<{ result: string; isError: boolean; }> {
    const tool = this.tools.find(t => t.name === block.name);
    if (!tool) return { result: 'tool not found', isError: true };
    try {
      const parsed = tool.schema.safeParse(block.input);
      if (!parsed.success) {
        return { result: 'invalid input: ' + parsed.error.message, isError: true };
      }
      const out = await tool.execute(parsed.data as any);
      console.log(`\u001b[92mtool\u001b[0m: ${tool.name}(${JSON.stringify(block.input)})`);
      return { result: out, isError: false };
    } catch (e: any) {
      return { result: e.message, isError: true };
    }
  }
}
