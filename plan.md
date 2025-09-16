# Project Plan & Roadmap

This document consolidates the implementation plan, current status, and future roadmap (including session storage changes) for the `@gustavjorlov/agent` CLI.

---
## 1. High-Level Goals
- Provide a fast, no‑permission interactive coding agent invokable via `npx @gustavjorlov/agent`.
- Offer clear, layered configuration with user-level persistence.
- Support reproducible sessions (snapshot JSON logs) and future session listing/resume.
- Maintain minimal external dependencies and transparent tool execution.

---
## 2. Package & Distribution Strategy
- Public scoped package name: `@gustavjorlov/agent`.
- Binary exposed as `agent` (from `bin` mapping) so local/global installs use `agent`, while ad‑hoc runs use `npx @gustavjorlov/agent`.
- `package.json` includes:
```jsonc
"name": "@gustavjorlov/agent",
"bin": { "agent": "dist/cli.js" },
"files": ["dist", "README.md"],
"publishConfig": { "access": "public" },
"prepublishOnly": "npm run build"
```

---
## 3. Build & Layout
```
/ (repo root)
  src/
    cli.ts        # CLI entry (shebang)
    index.ts      # runAgent exported
    config.ts     # layered config loading
    agent.ts      # core loop & session logging
  dist/           # tsc output
  plan.md         # this consolidated plan
  README.md       # usage + roadmap
```
Decision: Use `dist/cli.js` directly as bin target; avoid duplicate copies.

---
## 4. Configuration Precedence
Order (lowest → highest):
1. Legacy project `.env` (deprecated; emits warning)
2. User config dir: `~/.config/agent/config.env` or `config.json` (`%APPDATA%/agent` on Windows)
3. Local `.agent.env`
4. `AGENT_CONFIG` (env var path)
5. `--config <path>` explicit flag

Supported formats: `.env` (dotenv) + JSON. Merged shallowly; later overrides earlier. Missing `ANTHROPIC_API_KEY` aborts run.

Helper: `getUserConfigDir()` chooses platform path; permission warnings emitted if group/other writable (POSIX).

---
## 5. CLI Responsibilities
- Args: `--help`, `--version`, `--config <path>`, `--verbose`, `init`.
- `init` command scaffolds user config directory & template `config.env`.
- Verbose mode prints merge trace + per-key source (excluding secrets).

---
## 6. Error & Exit Conventions
- Missing required key → stderr + exit code 1.
- Use `process.exitCode` vs forced exit where practical for testability.
- Display concise errors by default; stack traces only for unexpected failures (potential future `--debug`).

---
## 7. Security & Safety Considerations
- Never echo secret values; show only source locations.
- Warn on permissive file modes for config on POSIX.
- Restrict `run_shell_command` to safe whitelist.

---
## 8. Testing Strategy (Completed & Planned)
Current:
- Config precedence tests.
- Key source attribution tests.
- Permission warning test.
Planned:
- Session storage migration tests (Phase 3 prerequisite).
- Future: CLI integration test for `session list`.

---
## 9. Implementation Status Snapshot
(From previous `npx-status.md` and completed tasks.)

### Phase 1 (MVP) – Completed
- Exposed `runAgent(config)`
- Added layered `config.ts`
- Implemented `cli.ts` (args, version, help, init)
- Updated `package.json` (scoped publishable bin)
- Added baseline tests & README section

### Phase 2 – Completed Items
- Verbose flag (`--verbose`)
- Permission warnings
- Extended precedence coverage
- Per-key source mapping
- Deprecated `.env` notice

Remaining (nice-to-have before Phase 3):
- Additional resilience tests (invalid JSON, missing file, malformed env line)
- Optional: structured logging toggle

---
## 10. Phase 3: Session Management & Listing
Goal: Introduce `agent session list` / resume groundwork.

### 10.1 Prerequisite: Centralize Session JSON Storage
Current: Sessions written to local `./.agent/session-*.json`.
New: Central user-level storage: `~/.config/agent/sessions/projects/<project-slug>/`.

Proposed structure:
```
~/.config/agent/
  config.env
  sessions/
    projects/
      <project-slug>/
        meta.json                     # { cwd, slug, hash, createdAt, updatedAt, migrated }
        session-YYYYMMDD-HHMMSS.json
```
Slug derivation:
1. Absolute real path of CWD
2. `hash = sha256(path).hex.slice(0,10)`
3. Sanitize basename → `[a-z0-9-]+`
4. Combine: `<sanitized-basename>-<hash>`

Environment override: `AGENT_SESSION_DIR` for root (primarily tests / power user).

API Changes:
- New `sessionStore.ts` exporting:
  - `deriveProjectSlug(cwd)`
  - `getProjectSessionDir(cwd)`
  - `initProjectSessionDir(cwd)` (create + meta management)
  - `writeSessionSnapshot(cwd, snapshot)` (returns filename)
  - `migrateLegacySessions(cwd)`
- Replace inline `createSessionLogger` logic in `agent.ts` with calls into store module.

Migration Strategy:
- On first write: detect legacy `./.agent/session-*.json`; if found & target empty:
  - Move (or copy, then unlink) into new project directory; set `migrated: true`.
  - Emit one-line warning summary: `Migrated N legacy session files to centralized store.`
- No dual writes after migration.

Edge Cases:
- Multiple agents same project: unique filenames by timestamp; if collision within same second, append `-NN` suffix.
- Project moved/renamed: different path hash → new slug; old sessions remain; future resume may allow re-association.
- Permissions: create dirs `0700` (POSIX) and report if more permissive.

Completion Criteria:
- New sessions appear only in centralized store.
- Legacy directory no longer updated after first migration.
- Meta and slug deterministic & stable.

### 10.2 Command: `agent session list` (Post-prerequisite)
- Enumerate `sessions/projects/*/`.
- For each `meta.json`, gather:
  - Project display name (basename portion of slug)
  - Total session files
  - Last session timestamp
  - Original `cwd`
- Output table; with `--current` flag: filter to slug for current CWD.
- Optional flags: `--limit N`, `--json`.

---
## 11. Future Enhancements (Beyond Phase 3)
- Conversation pruning / summarization for long sessions.
- Transcript export (`agent session export <id>`).
- Streaming model output.
- Richer JSON schema derivation (full Zod → JSON Schema fidelity).
- Rate limiting for network tools.
- Binary / large file handling safeguards.

---
## 12. Open Questions
- Should session resume restore tool state or just conversation? (Pending design.)
- Add encryption option for session logs? (Likely out-of-scope early.)
- Introduce config option to disable session logging for privacy? (Potential flag.)

---
## 13. Next Actionable Tasks
1. Implement `sessionStore.ts` with slug + meta + migration.
2. Refactor `agent.ts` to use session store.
3. Add migration + write tests.
4. Implement `--current` filter logic scaffolding (even before list command fully shipped for test usage).
5. Add `agent session list` command parsing (hidden until stable).

---
## 14. Acceptance Criteria Summary (Phase 3 Prerequisite)
- Running agent twice in same project writes to same slug dir.
- Migration notice appears once when legacy sessions are first detected & moved.
- Listing prototype (internal) enumerates correct counts.

---
## 15. Risk & Mitigation
| Risk | Mitigation |
|------|------------|
| Directory permission errors | Fallback to legacy path with warning; user fix instructions |
| Hash collision (extremely low) | Include 10 hex chars; can extend to 12 if ever detected |
| Race during simultaneous start | Distinct filenames; optional future lock file |
| Large session count slowdown | Add simple `index.json` cache later |

---
## 16. Glossary
- CWD: Current Working Directory where user invoked CLI.
- Slug: Deterministic, user-friendly, non-revealing directory identifier.
- Legacy sessions: Files in project-local `./.agent/` before migration.

---
## 17. Changelog Intent (Planned Entries)
- feat: centralized session storage with migration
- feat: verbose config source tracing
- chore: permission warnings for config files
- feat: (upcoming) session listing command

---
End of consolidated plan.
