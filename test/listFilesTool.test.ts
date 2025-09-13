import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { listFilesTool } from '../src/tools/listFilesTool.js';

// Helper to run the tool (schema already validated externally in real usage)
function run(pathArg?: string) {
  return JSON.parse(listFilesTool.execute({ path: pathArg ?? '' } as any));
}

describe('listFilesTool', () => {
  const tempRoot = path.join(process.cwd(), 'test-temp-list-files');
  const subDir = path.join(tempRoot, 'sub');
  const nestedFile = path.join(subDir, 'b.txt');
  const rootFile = path.join(tempRoot, 'a.txt');

  beforeAll(() => {
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(rootFile, 'A');
    fs.writeFileSync(nestedFile, 'B');
  });

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('lists direct children (non recursive) for provided path', () => {
    const entries = run(tempRoot).sort();
    expect(entries).toEqual(['a.txt', 'sub/']);
  });

  it('treats empty path as current directory', () => {
    const entriesContainsPkg = run('').includes('package.json');
    expect(entriesContainsPkg).toBe(true);
  });

  it('returns only directory immediate contents (no deep files)', () => {
    const entries = run(tempRoot);
    expect(entries).not.toContain('sub/b.txt');
  });

  it('returns empty list when path is a file', () => {
    const entries = run(rootFile);
    expect(entries).toEqual([]);
  });
});
