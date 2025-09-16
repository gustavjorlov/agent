// agent.ts
// Core event loop translating the Go example into TypeScript.
// Responsibilities:
//  - Maintain conversation history (stateless server requires full resend)
//  - Send tool definitions with each inference
//  - Detect tool_use blocks, execute locally, feed back tool_result blocks
//  - Continue loop until user interrupts (Ctrl-C)
import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { initProjectSessionDir, writeSessionSnapshot } from './sessionStore.js';
import { defaultTools, toAnthropicTool } from "./tools.js";
import type { Tool } from "./tool.js";
import { z } from "zod";

interface AgentOptions {
  model: string;
  maxTokens: number;
  tools?: Tool[];
}

// Simplified shape matching what the SDK expects.
interface ConversationMessage {
  role: "user" | "assistant";
  content: any; // Anthropic content blocks
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
    /**
     * Main interactive loop:
     * 1. Optionally read user input (unless we're in a tool-execution follow up)
     * 2. Send full conversation + tool defs to Anthropic
     * 3. Stream over returned content blocks
     *    - Print text blocks
     *    - Accumulate tool_use blocks, execute them
     * 4. If tools were used, append their tool_result blocks as a synthetic user message
     *    and immediately iterate WITHOUT reading new user input (model gets results first)
     * 5. If no tools were used, go back to reading user input.
     */
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = (q: string) =>
      new Promise<string>((res) => rl.question(q, res));

    console.log("Chat with Claude (ctrl-c to quit)");
    const conversation: ConversationMessage[] = [];

    // Initialize centralized session storage (may migrate legacy local sessions)
    const { migratedCount } = initProjectSessionDir(process.cwd());
    if (migratedCount > 0) {
      console.warn(`[info] Migrated ${migratedCount} legacy session file(s) to centralized store.`);
    }
    const writeSnapshot = () => {
      try {
        const snapshot = {
          model: this.model,
          maxTokens: this.maxTokens,
          createdAt: new Date().toISOString(),
          messages: conversation,
        };
        writeSessionSnapshot(process.cwd(), snapshot as any);
      } catch {}
    };

    let readUserInput = true;
    while (true) {
      if (readUserInput) {
        // Prompt user and push input as a text block into conversation history
        const userInput = await ask("\u001b[94mYou\u001b[0m: ");
        if (!userInput) continue;
        conversation.push({
          role: "user",
          content: [{ type: "text", text: userInput }],
        });
        writeSnapshot();
      }

      // Perform inference with accumulated conversation (stateless API requires full replay)
      const message = await this.infer(conversation);
      conversation.push({ role: "assistant", content: message.content });
      writeSnapshot();

      const toolResults: any[] = [];
      for (const block of message.content) {
        if (block.type === "text") {
          // Plain text from model
          console.log(`\u001b[93mClaude\u001b[0m: ${block.text}`);
        } else if (block.type === "tool_use") {
          // Model is requesting a tool; execute synchronously and collect results
          const result = await this.executeTool(block);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: [{ type: "text", text: result.result }],
            is_error: result.isError,
          });
        }
      }

      if (toolResults.length === 0) {
        // No tool usage -> wait for next user input
        readUserInput = true;
        continue;
      }

      // Tools used -> feed results back immediately (no new user input yet)
      readUserInput = false;
      conversation.push({ role: "user", content: toolResults });
      writeSnapshot();
    }
  }

  private async infer(conversation: ConversationMessage[]) {
    // Transform our internal tool definitions into Anthropic API schema each turn
    const toolsForAnthropic = this.tools.map((t) => toAnthropicTool(t));
    // NOTE: We resend the full conversation every call; consider pruning in long sessions.
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: conversation.map((m) => ({ role: m.role, content: m.content })),
      tools: toolsForAnthropic,
    });
    return response;
  }

  private async executeTool(
    block: Anthropic.Messages.ToolUseBlock
  ): Promise<{ result: string; isError: boolean }> {
    // Locate registered tool by name
    const tool = this.tools.find((t) => t.name === block.name);
    if (!tool) return { result: "tool not found", isError: true };
    try {
      // Validate / parse tool input according to its Zod schema
      const parsed = tool.schema.safeParse(block.input);
      if (!parsed.success) {
        return {
          result: "invalid input: " + parsed.error.message,
          isError: true,
        };
      }
      // Execute business logic (sync or async)
      const out = await tool.execute(parsed.data as any);
      console.log(
        `\u001b[92mtool\u001b[0m: ${tool.name}(${JSON.stringify(block.input)})`
      );
      return { result: out, isError: false };
    } catch (e: any) {
      // Surface error text back to model so it can decide to retry / adapt
      return { result: e.message, isError: true };
    }
  }

  // Legacy createSessionLogger removed (centralized session store now used)
}
