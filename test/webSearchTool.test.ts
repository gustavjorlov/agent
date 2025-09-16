// Deprecated: webSearchTool tests retained as a minimal smoke test to ensure
// backward compatibility shim continues to work. New tests live in urlFetchTool.test.ts
import { describe, it, expect } from 'vitest';
import { webSearchTool } from '../src/tools/webSearchTool.js';

describe('webSearchTool (deprecated shim)', () => {
  it('exposes renamed tool metadata', () => {
    expect(webSearchTool.name).toBe('url_fetch');
  });
});
