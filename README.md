# Code Editing Agent (TypeScript)

Coding agent that doesn't stop and ask for permissions, it goes on until the task is done 😎

Implements:
- Chat loop with Claude
- Tool definitions sent via Messages API
- Twelve tools:
  - File Operations:
    - `read_file`: Read the contents of a specified file
    - `list_files`: List files and directories at a given path
    - `edit_file`: Make edits to a text file via string replacement
    - `create_file`: Create a new text file with provided content
  - Web & System:
    - `web_search`: Fetch a URL and return the HTML/text response
    - `run_shell_command`: Execute whitelisted shell commands
  - Git Version Control:
    - `git_add`: Add file(s) to the git staging area
    - `git_commit`: Commit staged changes with a message
    - `git_status`: Show working tree status
    - `git_log`: Show commit history
    - `git_branch`: List, create, or checkout branches
    - `git_merge`: Merge a branch into the current branch
    - `git_pull`: Pull latest changes from a remote

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
- "Create a new directory called 'examples' with a README file"
- Git Operations:
  - "Show me the git status and explain what's changed"
  - "Add all files and commit with a message 'Initial implementation'"
  - "Create a new feature branch and switch to it"
  - "Show me the recent commit history"
  - "Merge the feature branch into main"

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

## CLI (npx) Usage
This project can be invoked directly without cloning once published:

```
npx @gustavjorlov/agent --help
```

### Configuration Locations (precedence highest last)
1. Legacy project `.env` (deprecated – warning emitted)
2. User config directory: `~/.config/agent/config.env` or `config.json`
3. Local `.agent.env`
4. `AGENT_CONFIG` environment variable pointing to a file
5. `--config /path/to/file` (highest)

Create a user config quickly:
```
npx @gustavjorlov/agent init
```
Then edit `~/.config/agent/config.env`:
```
ANTHROPIC_API_KEY=sk-your-key
MODEL=claude-3-7-sonnet-20250219
MAX_TOKENS=1024
```

Run the chat:
```
npx @gustavjorlov/agent
```

Override model ad-hoc:
```
npx @gustavjorlov/agent --config ./my-session.env
```

The binary name when linked locally is `agent` (e.g. after `npm link`).
