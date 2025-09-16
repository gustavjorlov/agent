#!/usr/bin/env node
// cli.ts - npx entry point
import { loadConfig } from './config.js';
import { runAgent } from './index.js';

interface ParsedArgs {
  help?: boolean;
  version?: boolean;
  configPath?: string;
  init?: boolean;
  verbose?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === 'init') out.init = true;
    else if (a === '--config') out.configPath = argv[++i];
    else if (a.startsWith('--config=')) out.configPath = a.split('=')[1];
  else if (a === '--verbose') out.verbose = true;
  }
  return out;
}

function printHelp() {
  console.log(`Usage: npx @gustavjorlov/agent [options] [init]\n\nOptions:\n  --help, -h          Show help\n  --version, -v       Show version\n  --config <path>     Specify config file (.env or .json)\n  --verbose           Print resolved configuration & source list (no secrets)\n\nCommands:\n  init                Create a user config directory & sample config file\n\nConfig Precedence (lowest to highest):\n  legacy .env (deprecated) -> user config -> .agent.env -> AGENT_CONFIG path -> --config path\n`);
}

async function ensureInit(): Promise<void> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { getUserConfigDir } = await import('./config.js');
  const dir = getUserConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const envPath = path.join(dir, 'config.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'ANTHROPIC_API_KEY=\nMODEL=claude-3-7-sonnet-20250219\nMAX_TOKENS=1024\n');
    console.log('Created', envPath);
  } else {
    console.log('Config already exists at', envPath);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.version) {
    try {
      const mod: any = await import('../package.json', { assert: { type: 'json' } } as any);
      const pkg = mod.default || mod;
      console.log(pkg.version || 'unknown');
    } catch {
      console.log('unknown');
    }
    return;
  }
  if (args.init) {
    await ensureInit();
    return;
  }

  const loaded = loadConfig({ explicitPath: args.configPath, env: process.env });
  if (loaded.warnings.length) {
    for (const w of loaded.warnings) console.warn('[warn]', w);
  }
  if (args.verbose) {
    console.log('Config sources (in merge order):');
    for (const s of loaded.sourceSummary) console.log(' -', s);
    const safe: Record<string, string> = {};
    for (const [k,v] of Object.entries(loaded.keySources)) {
      if (k.toUpperCase().includes('KEY') || k.toUpperCase().includes('SECRET')) continue; // avoid echoing secrets
      safe[k] = loaded.keySources[k];
    }
    console.log('Key sources:', safe);
    console.log('Resolved model:', loaded.model, 'maxTokens:', loaded.maxTokens);
  }
  if (!loaded.apiKey) {
    console.error('Cannot continue: missing ANTHROPIC_API_KEY. Use `init` or supply a config.');
    process.exitCode = 1;
    return;
  }
  process.env.ANTHROPIC_API_KEY = loaded.apiKey;
  await runAgent({ model: loaded.model, maxTokens: loaded.maxTokens });
}

main().catch(err => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
