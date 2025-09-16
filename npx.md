# Implementation Plan: npx Executable CLI for this Project

Goal: Make the agent runnable via `npx @gustavjorlov/agent` (scoped package) while relocating runtime configuration from `.env` to a persistent user config directory (e.g. `~/.config/agent/`).

---
## 1. Package Naming & Publication Strategy
- Target public name: `@gustavjorlov/agent` (you own the username so the personal scope is already yours).
- Replace current `name` with `"@gustavjorlov/agent"` and remove `"private": true`.
- First publish of a scoped package: `npm publish --access public` (required once).
- Optional later: unscoped alias package `agent` that depends on / points to the scoped package.

Decision: Rename directly to `@gustavjorlov/agent` before first public release.

## 2. Directory / File Layout Changes
```
/ (repo root)
  package.json (rename, add bin field, remove private)
  bin/
    agent.js            # Compiled JS entry (built from src/cli.ts or src/index.ts)
  src/
    cli.ts              # New: minimal CLI wrapper (arg parsing, config resolution)
    index.ts            # Existing: main runtime entry (may be refactored into exported function)
  npx.md                # This plan
```

## 3. Build & Output
- Use TypeScript build (`tsc`) to emit `dist/`.
- Option A (direct): Point `bin` to `dist/cli.js` (preferred).
- Option B (copy): Post-build script copies `dist/cli.js` → `bin/agent.js`.

Decision: Use `dist/cli.js` directly to avoid duplication.

## 4. package.json Modifications
Scoped package bin mapping (binary name shown when globally linked is `agent`; npx command uses the package name):
Add:
```jsonc
"name": "@gustavjorlov/agent",
"bin": {
  "agent": "dist/cli.js"
},
"files": ["dist", "README.md"],
"publishConfig": { "access": "public" }
```
Remove: `private` (must not be present to publish).
Ensure `build` is run before publish (manual or `prepublishOnly`: "npm run build").

Add script:
```jsonc
"prepublishOnly": "npm run build"
```

## 5. Executable Script Requirements
`dist/cli.js` (emitted from `src/cli.ts`) must start with shebang:
```ts
#!/usr/bin/env node
```
TypeScript handling: put shebang in `src/cli.ts`; `tsc` preserves it.

## 6. CLI Entry Design
`src/cli.ts` responsibilities:
- Parse args (initially minimal: `--config <path>`, `--version`, `--help`).
- Resolve config (env + file cascade).
- Call a main function exported from `src/index.ts` (refactor if needed to accept a config object instead of reading `.env` directly).
- Handle async errors with proper exit codes.

## 7. Configuration Strategy (Relocating from .env)
Problems with `.env` for global CLI: not user-scoped across updates, not discoverable, not shareable across multi-project usage.

Proposed resolution order (higher wins):
1. Explicit `--config /path/to/file` (JSON or `.env`).
2. `AGENT_CONFIG` env var (path).
3. Local project `.agent.env` (if present in CWD).
4. User config file: `~/.config/agent/config.(json|env)`.
5. Fallback: legacy `.env` in CWD (temporary backward compatibility; deprecate later with warning).

Supported formats:
- `.env` key/value via `dotenv`.
- JSON (`{ "ANTHROPIC_API_KEY": "..." }`).

Implementation:
- Utility `loadConfig()` returning a plain object.
- Merge sources shallowly; later sources override earlier according to priority list above.
- Validate required keys (e.g. `ANTHROPIC_API_KEY`). Provide actionable error if missing.

## 8. Creating User Config Directory
- Use `os.homedir()` + `path.join(homedir, '.config', 'agent')` (Linux/macOS) and on Windows fallback:
  - Prefer `%APPDATA%/agent` if present else `%USERPROFILE%/.agent`.
- Provide helper `getUserConfigDir()`.
- Optional command: `npx @gustavjorlov/agent init` → creates directory & template config.

## 9. Backward Compatibility
- If `.env` is used and no new config file found, print one-line warning: "[deprecation] Using legacy .env; migrate to ~/.config/agent/config.env".

## 10. Minimal Argument Parsing
Phase 1: Manual parsing (no dependency bloat). Later: consider `commander` or `yargs` if complexity grows.

Example accepted commands:
- `npx @gustavjorlov/agent` (default behavior)
- `npx @gustavjorlov/agent --config ~/my.json`
- `npx @gustavjorlov/agent init`
- `npx @gustavjorlov/agent --version`
- `npx @gustavjorlov/agent --help`

## 11. Error & Exit Conventions
- Missing required config → stderr message + exit code 1.
- Unhandled exception → log stack (if `--debug`), else concise message.
- Provide `process.exitCode` instead of direct `process.exit()` where feasible for testability.

## 12. Testing Strategy
- Add unit tests for `loadConfig()` covering merge precedence.
- Add test for shebang presence & executability: spawn `node dist/cli.js --help`.
- Use `vitest` with temporary directories for config layering.

## 13. Local Dev Flow
1. Implement `src/cli.ts` + config loader.
2. Update `package.json`: set name `@gustavjorlov/agent`, add bin, files, publishConfig, prepublishOnly.
3. Build: `npm run build`.
4. Local test via: `node dist/cli.js --help`.
5. Optional: `npm link` → invoke via `agent --help`.
6. Dry run packaging: `npm pack` then `npx ./<tarball>.tgz --help`.
7. First publish: `npm publish --access public`.
8. Usage: `npx @gustavjorlov/agent --help`.

## 14. Security Considerations
- Never print secrets in logs.
- If multiple sources define same key, last one (highest precedence) overrides silently; optionally add `--verbose` to show which file supplied each.
- Warn if file permissions on config are world-readable (UNIX `stat` check) for keys like API tokens (nice-to-have, can defer).

## 15. Incremental Delivery Phases
Phase 1 (MVP): bin setup, cli.ts, config loader (env + user + legacy `.env`), simple args.
Phase 2: init command, precedence tests, deprecation warning, version/help output.
Phase 3: verbose tracing, permission warnings, additional commands.

## 16. Acceptance Criteria (Phase 1)
- Running `npx @gustavjorlov/agent --help` prints usage.
- `bin` entry works after publish (dry-run locally with `npm pack` + `npx ./<tarball>.tgz --help`).
- Configuration loads from `~/.config/agent/config.env` and overrides from `--config`.
- Legacy `.env` still functional with warning.

## 17. Open Questions / Decisions Needed
- Rename package before first public release? (Pending)
- Required config keys list? (Assumed: `ANTHROPIC_API_KEY`).
- Should `init` generate JSON or .env by default? (Recommend `.env` for familiarity.)

## 18. Next Implementation Tasks (Phase 1 Breakdown)
1. Refactor `src/index.ts` to export `runAgent(config)`.
2. Add `src/cli.ts` with shebang, arg parsing, config resolution, call `runAgent`.
3. Implement `src/config.ts` (loadConfig, getUserConfigDir, readEnvFile, readJsonFile, merge logic, validation).
4. Update `package.json` (rename to `@gustavjorlov/agent`, add bin/files/publishConfig/prepublishOnly, remove private).
5. Add basic tests for config precedence.
6. Document usage in `README.md` (CLI section) + deprecation notice for legacy `.env` + scoped publish instructions.

---
This plan is intentionally concise yet actionable. Adjust naming or scope before coding if any open question decisions change.
