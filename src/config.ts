// config.ts
// Centralized configuration loading & precedence for the CLI.
// Precedence (highest wins):
// 1. Explicit --config path (JSON or .env)
// 2. AGENT_CONFIG env var path
// 3. Local .agent.env in CWD
// 4. User config (~/.config/agent/config.(env|json))
// 5. Legacy .env in CWD (deprecated warning)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';

export interface LoadedConfig {
  model: string;
  maxTokens: number;
  apiKey?: string; // ANTHROPIC_API_KEY
  sourceSummary: string[]; // trace of which layers contributed
  warnings: string[];
  keySources: Record<string,string>; // which layer supplied each key
}

interface LoadOptions {
  explicitPath?: string; // from --config
  env: NodeJS.ProcessEnv;
}

function readIfExists(p: string): string | undefined {
  try {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return fs.readFileSync(p, 'utf8');
    }
  } catch {}
  return undefined;
}

function parseEnvFormat(content: string): Record<string,string> {
  // Use dotenv to parse, but it only parses standard KEY=VALUE lines
  return dotenv.parse(content);
}

function parseJSONFormat(content: string): Record<string,string> {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      const out: Record<string,string> = {};
      for (const [k,v] of Object.entries(parsed)) {
        if (v != null) out[k] = String(v);
      }
      return out;
    }
  } catch {}
  return {};
}

function loadConfigFile(p: string): Record<string,string> {
  const content = readIfExists(p);
  if (!content) return {};
  if (p.endsWith('.json')) return parseJSONFormat(content);
  return parseEnvFormat(content); // treat everything else as .env
}

export function getUserConfigDir(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appdata = process.env.APPDATA;
    if (appdata) return path.join(appdata, 'agent');
    return path.join(home, '.agent');
  }
  return path.join(home, '.config', 'agent');
}

export function loadConfig(opts: LoadOptions): LoadedConfig {
  const sourceSummary: string[] = [];
  const warnings: string[] = [];
  const merged: Record<string,string> = {};
  const keySources: Record<string,string> = {};

  function merge(obj: Record<string,string>, label: string) {
    let contributed = false;
    for (const [k,v] of Object.entries(obj)) {
      merged[k] = v; // later overrides earlier
      keySources[k] = label;
      contributed = true;
    }
    if (contributed) sourceSummary.push(label);
  }

  // Merge in ascending precedence order so later merges win.
  // Lowest precedence: legacy .env (deprecated)
  const legacyContent = loadConfigFile(path.resolve('.env'));
  if (Object.keys(legacyContent).length) {
    warnings.push('Using legacy .env; migrate to ~/.config/agent/config.env');
    merge(legacyContent, '.env (legacy)');
  }
  // User config dir
  const userDir = getUserConfigDir();
  const userEnvPath = path.join(userDir, 'config.env');
  const userJsonPath = path.join(userDir, 'config.json');
  merge(loadConfigFile(userEnvPath), `user:${userEnvPath}`);
  merge(loadConfigFile(userJsonPath), `user:${userJsonPath}`);
  // Basic permission check (POSIX only)
  try {
    if (process.platform !== 'win32') {
      for (const p of [userEnvPath, userJsonPath]) {
        if (fs.existsSync(p)) {
          const mode = fs.statSync(p).mode & 0o777;
            // Warn if group or others have write permission
            if ((mode & 0o022) !== 0) {
              warnings.push(`Config file ${p} is group/other writable (mode ${mode.toString(8)}). Consider chmod 600.`);
            }
        }
      }
    }
  } catch {}
  // Local .agent.env
  merge(loadConfigFile(path.resolve('.agent.env')), '.agent.env');
  // AGENT_CONFIG path
  const envPath = opts.env.AGENT_CONFIG;
  if (envPath) {
    merge(loadConfigFile(path.resolve(envPath)), `AGENT_CONFIG=${envPath}`);
  }
  // Highest precedence: explicit --config
  if (opts.explicitPath) {
    merge(loadConfigFile(path.resolve(opts.explicitPath)), `--config ${opts.explicitPath}`);
  }

  // Provide default model + max tokens if not set
  const model = merged.MODEL || 'claude-3-7-sonnet-20250219';
  const maxTokens = parseInt(merged.MAX_TOKENS || '1024', 10);
  const apiKey = merged.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    warnings.push('Missing ANTHROPIC_API_KEY (required).');
  }

  return { model, maxTokens, apiKey, sourceSummary, warnings, keySources };
}
