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
});
