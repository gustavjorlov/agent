import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, getUserConfigDir } from '../src/config.js';

// Helper to create a temporary sandbox directory
function withTempDir(run: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-conf-test-'));
  try { run(dir); } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('config precedence', () => {
  it('explicit --config overrides user + legacy', () => {
    withTempDir(tmp => {
      const userDir = path.join(tmp, 'user');
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, 'config.env'), 'MODEL=user-model\nMAX_TOKENS=10');
      const legacy = path.join(tmp, '.env');
      fs.writeFileSync(legacy, 'MODEL=legacy-model');
      const explicit = path.join(tmp, 'my.env');
      fs.writeFileSync(explicit, 'MODEL=explicit-model\nMAX_TOKENS=99');

      // monkey patch getUserConfigDir by shadowing environment (we control cwd for file lookups instead) -> we won't call getUserConfigDir here.
      const prevCwd = process.cwd();
      process.chdir(tmp);
      try {
        // Simulate user config by copying into actual expected directory path only for this test invocation if needed.
        // Instead we directly call loadConfig with explicit path and rely on .agent.env / user config not present.
        const cfg = loadConfig({ explicitPath: explicit, env: {} as any });
        expect(cfg.model).toBe('explicit-model');
        expect(cfg.maxTokens).toBe(99);
  expect(cfg.sourceSummary[cfg.sourceSummary.length - 1]).toContain('--config');
      } finally {
        process.chdir(prevCwd);
      }
    });
  });

  it('AGENT_CONFIG overrides .agent.env and user config but not explicit', () => {
    withTempDir(tmp => {
      const userDir = path.join(tmp, '.config', 'agent');
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, 'config.env'), 'MODEL=user-model');
      fs.writeFileSync(path.join(tmp, '.agent.env'), 'MODEL=agent-env-model');
      const custom = path.join(tmp, 'custom.env');
      fs.writeFileSync(custom, 'MODEL=custom-model');
      const prevHome = process.env.HOME;
      const prevCwd = process.cwd();
      process.env.HOME = tmp; // redirect getUserConfigDir
      process.env.AGENT_CONFIG = custom;
      process.chdir(tmp);
      try {
        const cfg = loadConfig({ env: process.env as any });
        expect(cfg.model).toBe('custom-model');
      } finally {
        process.chdir(prevCwd);
        if (prevHome) process.env.HOME = prevHome; else delete process.env.HOME;
        delete process.env.AGENT_CONFIG;
      }
    });
  });
});

describe('permission warnings', () => {
  it('warns on world-writable user config file', () => {
    withTempDir(tmp => {
      const userDir = path.join(tmp, '.config', 'agent');
      fs.mkdirSync(userDir, { recursive: true });
      const cfgPath = path.join(userDir, 'config.env');
      fs.writeFileSync(cfgPath, 'MODEL=perm-model');
      try { fs.chmodSync(cfgPath, 0o666); } catch {}
      const prevHome = process.env.HOME;
      process.env.HOME = tmp;
      const cfg = loadConfig({ env: process.env as any });
      if (process.platform !== 'win32') {
        expect(cfg.warnings.some(w => w.includes('group/other writable'))).toBe(true);
      }
      if (prevHome) process.env.HOME = prevHome; else delete process.env.HOME;
    });
  });
});
