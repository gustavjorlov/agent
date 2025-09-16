# Code Editing Agent (TypeScript)

> Quick Start (no clone required)
>
> 1. Run the agent immediately:
>    ```
>    npx @gustavjorlov/agent
>    ```
> 2. When prompted (or if it errors about a missing key), create a user config:
>    ```
>    npx @gustavjorlov/agent init
>    ```
> 3. Open the created file `~/.config/agent/config.env` (on macOS/Linux) and add your Anthropic API key:
>    ```
>    ANTHROPIC_API_KEY=sk-your-key
>    MODEL=claude-3-7-sonnet-20250219
>    MAX_TOKENS=1024
>    ```
>    (On Windows the directory is usually `%APPDATA%/agent/config.env`.)
> 4. Re-run:
>    ```
>    npx @gustavjorlov/agent
>    ```
> 5. Optional: show help / sources:
>    ```
>    npx @gustavjorlov/agent --help
>    npx @gustavjorlov/agent --verbose
>    ```
>
> You only need to set the key once; future runs will pick it up automatically.

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
    - `url_fetch`: Fetch the contents of a URL (HTTP/HTTPS) and return raw text/HTML (10s timeout)
    - `run_shell_command`: Execute whitelisted shell commands
  - Git Version Control:
    - `git_add`: Add file(s) to the git staging area
    - `git_commit`: Commit staged changes with a message
    - `git_status`: Show working tree status
    - `git_log`: Show commit history
    - `git_branch`: List, create, or checkout branches
    - `git_merge`: Merge a branch into the current branch
    - `git_pull`: Pull latest changes from a remote

## Dev Setup

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
- `url_fetch` fetches raw HTML/text from URLs with a 10-second timeout
- `create_file` can overwrite existing files when the overwrite flag is set to true

## Future Enhancements
- Add streaming output
- Add richer JSON schema generation
- Expand test coverage for all tools
- Add more whitelisted shell commands
- Implement rate limiting for web requests
- Support binary file handling

## Roadmap / Phases

This section outlines upcoming structured phases. (Numbering starts at the next significant feature batch.)

### Phase 3: Session Management & Listing
Goal: Introduce `agent session list` / future resume capabilities. Prerequisite: centralize session storage.

#### Prerequisite: Centralize Session JSON Storage
Currently session snapshots are written to a per-project hidden directory: `./.agent/session-*.json`.
We will migrate to a unified user-level storage alongside config (e.g. `~/.config/agent` on macOS/Linux, `%APPDATA%/agent` on Windows) while still keeping sessions segregated per original working directory.

Structure (proposed):
```
~/.config/agent/
  config.env
  sessions/
    projects/
      <project-slug>/
        meta.json            # { cwd, slug, hash, createdAt, updatedAt, migrated }
        session-YYYYMMDD-HHMMSS.json
```

Project slug derivation:
1. Resolve absolute path of the CWD when the agent starts.
2. Compute `hash = sha256(realpath).hex.slice(0,10)`.
3. Sanitize `basename(realpath)` → lowercase alphanumerics + `-`.
4. Slug format: `<sanitized-basename>-<hash>` (ensures uniqueness even for folders with same name).

Rationale:
- Enables global listing across projects without scanning the whole filesystem.
- Avoids leaking full paths in directory names (privacy) while still being human friendly.
- Stable & deterministic for resume / indexing.

Environment override (optional):
- `AGENT_SESSION_DIR` → if set, supersedes default `sessions/` root (useful for testing).

API / Code Changes (planned):
1. Add util `getSessionProjectDir(cwd)` in a new `sessionStore.ts`.
2. Replace `createSessionLogger` in `agent.ts` to write into project dir; create if missing.
3. Write / update `meta.json` on first session write or when `cwd` changes.
4. (Optional early) Maintain a lightweight project-level `index.json` summarizing sessions (id, createdAt, file path) to speed up listing.
5. Add migration routine: if `./.agent/session-*.json` exists and target project dir is empty, copy files over, set `migrated: true` in `meta.json`, optionally leave originals (first release) then remove in later version.

Session File Naming (unchanged):
`session-YYYYMMDD-HHMMSS.json` (keeps chronological sorting). Potential later enhancement: append incremental counter if multiple in same second.

Edge Cases Considered:
- Permissions: ensure `sessions/projects/<slug>` is `0700` (POSIX) if created; warn if broader.
- Concurrency: if multiple agent processes start simultaneously, create dir with `recursive: true`; writing distinct filenames avoids collisions. (Future: file locking for index maintenance.)
- Very large number of sessions: listing will first read filenames; only parse `meta.json` + maybe first N session files for summary.
- Path changes (project moved): if `cwd` hash differs, a new slug is created; old slug remains intact (explicit resume may later allow re-link).

Listing Command (Phase 3 proper):
- `agent session list` (future) will enumerate `sessions/projects/*/*session-*.json`, building a table: Project Name, Sessions, Last Activity, Path (from meta.json `cwd`).
- Filtering by current project: only show sessions whose `meta.json.cwd` matches the resolved current path hash.

Migration Strategy:
1. Ship code that writes ONLY to new location but also (temporarily) copies to legacy `./.agent` for one minor version (optional) OR
2. On start, detect legacy sessions → migrate forward → print one-line notice with count migrated.
Chosen approach: forward migration on demand (no dual writes) to keep logic simple.

Telemetry / Privacy (future consideration):
- No extra data beyond existing messages; meta only stores original absolute `cwd` for local listing (never transmitted externally).

Completion Criteria for Prerequisite:
- New sessions appear under user config dir with correct project slug.
- Running agent twice in same directory appends new session files to same slug.
- Legacy `./.agent` no longer receives new writes (post-migration).
- README updated; warning printed once if legacy sessions migrated.

After this prerequisite is merged, implement the `agent session list` command to consume the new structure.

Runtime note: On first run after upgrading, if legacy `./.agent/session-*.json` files are detected they will be migrated automatically to the centralized store with a one-line notice. New sessions are no longer written to the project-local `.agent` folder.

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

Deprecated notice: Root `.env` support will be removed after version 0.3.0. Migrate to `~/.config/agent/config.env`, `.agent.env`, or use `--config`.
