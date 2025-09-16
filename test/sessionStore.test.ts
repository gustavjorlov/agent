import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { deriveProjectSlug, initProjectSessionDir, writeSessionSnapshot, listProjectSessions } from '../src/sessionStore.js';

function makeTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

describe('sessionStore', () => {
  let projectDir: string;
  let originalCwd: string;
  let prevSessionDir: string | undefined;

  beforeEach(() => {
    projectDir = makeTempDir('agent-project-');
    originalCwd = process.cwd();
    process.chdir(projectDir);
    prevSessionDir = process.env.AGENT_SESSION_DIR;
    // Force sessions root into a temp dir for isolation
    process.env.AGENT_SESSION_DIR = makeTempDir('agent-sessions-');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (prevSessionDir === undefined) delete process.env.AGENT_SESSION_DIR; else process.env.AGENT_SESSION_DIR = prevSessionDir;
  });

  it('derives stable slug', () => {
    const a = deriveProjectSlug(projectDir);
    const b = deriveProjectSlug(projectDir);
    expect(a.slug).toBe(b.slug);
    expect(a.hash).toBe(b.hash);
  });

  it('initializes project dir and meta, writes session snapshot', () => {
    const { projectDir: storeDir, migratedCount } = initProjectSessionDir(projectDir);
    expect(migratedCount).toBe(0);
    expect(fs.existsSync(storeDir)).toBe(true);
    const written = writeSessionSnapshot(projectDir, { model: 'test-model', maxTokens: 10, createdAt: new Date().toISOString(), messages: [] });
    expect(written && fs.existsSync(written)).toBe(true);
    const sessions = listProjectSessions(projectDir);
    expect(sessions.length).toBe(1);
  });

  it('migrates legacy local sessions when present', () => {
    // create legacy .agent with a dummy session file
    const legacyDir = path.join(projectDir, '.agent');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'session-20250101-010101.json'), '{}', 'utf8');
    const { migratedCount } = initProjectSessionDir(projectDir);
    expect(migratedCount).toBe(1);
  });
});
