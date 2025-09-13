# Code Editing Agent (TypeScript)

A translation of the "How to Build an Agent" article's Go example into a Node.js + TypeScript project using the official Anthropic TypeScript SDK.

Implements:
- Chat loop with Claude
- Tool definitions sent via Messages API
- Three tools: `read_file`, `list_files`, `edit_file`

## Setup

1. Install dependencies:

```
npm install
```

2. Copy env file and set your key:

```
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
```

3. Run in dev mode (TypeScript directly):

```
npm run dev
```

4. Or build & run:

```
npm run build
npm start
```

## Usage
Type your prompts. The agent will call tools automatically and print tool invocations.

Examples:
- "What do you see in this directory?"
- "Create fizzbuzz.js that prints FizzBuzz to 100"
- "Edit fizzbuzz.js so it only prints to 15"

## Notes
- Minimal JSON schema translation from Zod (enough for the demo)
- Tool execution results are returned as `tool_result` blocks
- `edit_file` uses simple string replacement mirroring the article's approach

## Future Enhancements
- Add streaming output
- Add richer JSON schema generation
- Add unit tests for each tool
