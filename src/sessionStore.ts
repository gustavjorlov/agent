// sessionStore.ts
// Centralized session storage management per Phase 3 plan.
// Responsibilities:
//  - Derive stable per-project slug from CWD real path
//  - Initialize project session directory & meta.json
//  - Migrate legacy local ./\.agent/session-*.json files
//  - Provide snapshot writer returning the full file path
//  - Respect AGENT_SESSION_DIR override
//  - Attempt to keep permissions restrictive (POSIX)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getUserConfigDir } from './config.js';

export interface SessionSnapshot {
  model: string;
  maxTokens: number;
  createdAt: string; // ISO
  messages: any[];
}

interface ProjectMeta {
  cwd: string;
  slug: string;
  hash: string; // path hash
  createdAt: string;
  updatedAt: string;
  migrated?: boolean;
}

function getSessionsRoot(): string {
  if (process.env.AGENT_SESSION_DIR) return path.resolve(process.env.AGENT_SESSION_DIR);
  const base = getUserConfigDir();
  return path.join(base, 'sessions', 'projects');
}

export function deriveProjectSlug(cwd: string): { slug: string; hash: string; baseName: string } {
  const real = fs.existsSync(cwd) ? fs.realpathSync(cwd) : path.resolve(cwd);
  const hash = crypto.createHash('sha256').update(real).digest('hex').slice(0, 10);
  const baseNameRaw = path.basename(real).toLowerCase();
  const baseName = baseNameRaw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  return { slug: `${baseName}-${hash}`, hash, baseName };
}

export function getProjectSessionDir(cwd: string): string {
  const { slug } = deriveProjectSlug(cwd);
  return path.join(getSessionsRoot(), slug);
}

function ensureDirSecure(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  try {
    if (process.platform !== 'win32') {
      fs.chmodSync(p, 0o700); // best effort
    }
  } catch {}
}

function readMeta(dir: string): ProjectMeta | undefined {
  const metaPath = path.join(dir, 'meta.json');
  try {
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf8');
      return JSON.parse(raw) as ProjectMeta;
    }
  } catch {}
  return undefined;
}

function writeMeta(dir: string, meta: ProjectMeta) {
  try {
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  } catch {}
}

function migrateLegacySessionsIfNeeded(cwd: string, projectDir: string, meta: ProjectMeta): number {
  const legacyDir = path.join(cwd, '.agent');
  if (!fs.existsSync(legacyDir)) return 0;
  // Collect legacy session files
  const files = fs.readdirSync(legacyDir).filter(f => f.startsWith('session-') && f.endsWith('.json'));
  if (!files.length) return 0;
  // If project dir already has session files, skip migration
  const existing = fs.readdirSync(projectDir).filter(f => f.startsWith('session-') && f.endsWith('.json'));
  if (existing.length) return 0;
  let migrated = 0;
  for (const f of files) {
    try {
      const from = path.join(legacyDir, f);
      const to = path.join(projectDir, f);
      fs.copyFileSync(from, to);
      migrated++;
    } catch {}
  }
  if (migrated) {
    meta.migrated = true;
    meta.updatedAt = new Date().toISOString();
    writeMeta(projectDir, meta);
  }
  return migrated;
}

export interface InitResult {
  projectDir: string;
  meta: ProjectMeta;
  migratedCount: number;
}

export function initProjectSessionDir(cwd: string): InitResult {
  const { slug, hash } = deriveProjectSlug(cwd);
  const root = getSessionsRoot();
  ensureDirSecure(root);
  const projectDir = path.join(root, slug);
  ensureDirSecure(projectDir);
  let meta = readMeta(projectDir);
  if (!meta) {
    meta = {
      cwd: fs.existsSync(cwd) ? fs.realpathSync(cwd) : path.resolve(cwd),
      slug,
      hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeMeta(projectDir, meta);
  }
  const migratedCount = migrateLegacySessionsIfNeeded(cwd, projectDir, meta);
  return { projectDir, meta, migratedCount };
}

function nextSessionFilename(projectDir: string, ts: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const base = `session-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  let filename = `${base}.json`;
  let counter = 1;
  while (fs.existsSync(path.join(projectDir, filename))) {
    filename = `${base}-${counter++}.json`;
  }
  return filename;
}

export function writeSessionSnapshot(cwd: string, snapshot: SessionSnapshot): string | undefined {
  const { projectDir } = initProjectSessionDir(cwd); // ensures meta/migration
  try {
    const filename = nextSessionFilename(projectDir, new Date());
    const full = path.join(projectDir, filename);
    fs.writeFileSync(full, JSON.stringify(snapshot, null, 2), 'utf8');
    return full;
  } catch {
    return undefined;
  }
}

export function listProjectSessions(cwd: string): string[] {
  const dir = getProjectSessionDir(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.startsWith('session-') && f.endsWith('.json'));
}

export function getMetaForCwd(cwd: string): ProjectMeta | undefined {
  const dir = getProjectSessionDir(cwd);
  return readMeta(dir);
}
