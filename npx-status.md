# npx Implementation Status

## Phase 1 (MVP) Progress
- [x] Refactor `index.ts` -> expose `runAgent(config)`
- [x] Add `config.ts` (loadConfig, precedence, validation)
- [x] Add `cli.ts` (shebang, args, calls runAgent)
- [x] Update `package.json` (scoped name, bin, files, prepublishOnly)
- [x] Basic config precedence tests
- [x] README CLI section (initial)

### Phase 1 Summary
All MVP tasks completed: refactor to exported runner, config loader with documented precedence, CLI entry (`cli.ts`) with init/help/version commands, scoped package metadata, tests green (8 passing), README updated, and status tracking in place.

Next (Phase 2) candidates:
- Add more comprehensive config precedence tests (cover AGENT_CONFIG & .agent.env layering)
- Implement verbose flag to print source of each resolved key
- Add permission warning for world-readable user config
- Add deprecation timeline for legacy .env usage

Phase 3 (future):
- Add additional subcommands (e.g., `agent session list`)
- Prune conversation history or provide transcript export command
- Optional: switch to an argument parsing library if complexity grows

### Recent Fixes
- Promoted `zod` to runtime dependency (was causing ERR_MODULE_NOT_FOUND in tarball smoke test).
- Added version fallback to use `process.env.npm_package_version` when JSON assert import fails in packed execution.

## Phase 2 Tasks (in progress)
- [x] Verbose flag to display resolved config + sources
- [x] Track per-key source & permission warnings
- [x] Precedence layering tests (AGENT_CONFIG, .agent.env, legacy, explicit)
- [x] Key source mapping test
- [x] Permission warning test
- [x] Help/deprecation messaging update

Notes:
- Initial code loads dotenv inside `index.ts`; refactor will remove side-effect import there and shift env loading to CLI/config layer.
