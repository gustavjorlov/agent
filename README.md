# Code Editing Agent (TypeScript)

Coding agent that doesn't stop and ask for permissions, it goes on until the task is done 😎
Implements:
- Chat loop with Claude
- Tool definitions sent via Messages API
- Six tools:
  - `read_file`: Read the contents of a specified file
  - `list_files`: List files and directories at a given path
  - `edit_file`: Make edits to a text file via string replacement
  - `create_file`: Create a new text file with provided content
  - `web_search`: Fetch a URL and return the HTML/text response
  - `run_shell_command`: Execute whitelisted shell commands

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
- "Fetch the HTML from example.com and summarize it"
- "Run 'git status' and explain the output"
- "Create a new directory called 'examples' with a README file"

## Notes
- Minimal JSON schema translation from Zod (enough for the demo)
- Tool execution results are returned as `tool_result` blocks
- `edit_file` uses simple string replacement mirroring the article's approach
- `run_shell_command` only allows whitelisted commands (ls, cat, echo, grep, head, tail, node, tsc, npm, npx, git, touch)
- `web_search` fetches raw HTML/text from URLs with a 10-second timeout
- `create_file` can overwrite existing files when the overwrite flag is set to true

## Future Enhancements
- Add streaming output
- Add richer JSON schema generation
- Expand test coverage for all tools
- Add more whitelisted shell commands
- Implement rate limiting for web requests
- Support binary file handling
