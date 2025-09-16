import { describe, it, expect, vi } from 'vitest';
import https from 'node:https';
import { webSearchTool } from '../src/tools/webSearchTool.js';

describe('webSearchTool (google scraping)', () => {
  it('parses top results from mocked HTML', async () => {
    const sampleHTML = `<!doctype html><html><body>
      <div><a href="/url?q=https://example.com/alpha&sa=U">Alpha Title</a><span>Alpha snippet content about alpha.</span></div>
      <div><a href="/url?q=https://example.org/bravo&sa=U">Bravo <b>Title</b></a><span>Bravo snippet describing bravo solution.</span></div>
      <div><a href="/url?q=https://example.net/charlie&sa=U">Charlie Title</a><span>Charlie snippet text is here.</span></div>
    </body></html>`;

    const mockResponse: any = {
      statusCode: 200,
      headers: {},
      on: vi.fn(),
    };

    mockResponse.on.mockImplementation((event: string, handler: any) => {
      if (event === 'data') handler(Buffer.from(sampleHTML));
      if (event === 'end') handler();
    });

    const getSpy = vi.spyOn(https, 'get').mockImplementation((opts: any, cb: any) => {
      cb(mockResponse);
      return { on: vi.fn(), setTimeout: vi.fn() } as any;
    });

    const out = await webSearchTool.execute({ query: 'alpha bravo' });
    expect(out).toMatch(/Alpha Title/);
    expect(out).toMatch(/https:\/\/example.com\/alpha/);
    expect(out).toMatch(/Bravo Title/);
    expect(out.split('\n').length).toBeGreaterThan(3);

    getSpy.mockRestore();
  });
});
