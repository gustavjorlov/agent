import { describe, it, expect, vi } from "vitest";
import { urlFetchTool } from "../src/tools/urlFetchTool.js";
import http from "node:http";
import https from "node:https";

// Helper to run the tool
async function run(url: string) {
  return await urlFetchTool.execute({ url });
}

describe("urlFetchTool", () => {
  it("fetches content from HTTP URLs", async () => {
    const mockResponse = {
      statusCode: 200,
      on: vi.fn(),
    };

    const httpGetMock = vi
      .spyOn(http, "get")
      .mockImplementation((url: any, callback: any) => {
        mockResponse.on.mockImplementation((event, handler) => {
          if (event === "data") handler(Buffer.from("Test HTTP Content"));
          if (event === "end") handler();
        });
        callback(mockResponse as any);
        return { on: vi.fn(), setTimeout: vi.fn() } as any;
      });

    const result = await run("http://example.com");
    expect(result).toBe("Test HTTP Content");
    expect(httpGetMock).toHaveBeenCalled();
    httpGetMock.mockRestore();
  });

  it("fetches content from HTTPS URLs", async () => {
    const mockResponse = { statusCode: 200, on: vi.fn() };
    const httpsGetMock = vi
      .spyOn(https, "get")
      .mockImplementation((url: any, callback: any) => {
        mockResponse.on.mockImplementation((event, handler) => {
          if (event === "data") handler(Buffer.from("Test HTTPS Content"));
          if (event === "end") handler();
        });
        callback(mockResponse as any);
        return { on: vi.fn(), setTimeout: vi.fn() } as any;
      });

    const result = await run("https://example.com");
    expect(result).toBe("Test HTTPS Content");
    expect(httpsGetMock).toHaveBeenCalled();
    httpsGetMock.mockRestore();
  });

  it("handles error responses", async () => {
    const mockResponse = { statusCode: 404, on: vi.fn() };
    const httpsGetMock = vi
      .spyOn(https, "get")
      .mockImplementation((url: any, callback: any) => {
        callback(mockResponse as any);
        return { on: vi.fn(), setTimeout: vi.fn() } as any;
      });

    await expect(run("https://example.com/not-found")).rejects.toThrow();
    httpsGetMock.mockRestore();
  });
});
