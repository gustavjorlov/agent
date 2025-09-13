import { describe, it, expect, vi } from "vitest";
import { webSearchTool } from "../src/tools/webSearchTool.js";
import http from "node:http";
import https from "node:https";

// Helper to run the tool
async function run(url: string) {
  return await webSearchTool.execute({ url });
}

describe("webSearchTool", () => {
  it("fetches content from HTTP URLs", async () => {
    // Mock setup
    const mockResponse = {
      statusCode: 200,
      on: vi.fn(),
    };

    // Mock the http.get method
    const httpGetMock = vi
      .spyOn(http, "get")
      .mockImplementation((url, callback) => {
        mockResponse.on.mockImplementation((event, handler) => {
          if (event === "data") {
            handler(Buffer.from("Test HTTP Content"));
          }
          if (event === "end") {
            handler();
          }
        });

        callback(mockResponse as any);

        return {
          on: vi.fn(),
          setTimeout: vi.fn(),
        } as any;
      });

    // Test the tool
    const result = await run("http://example.com");

    // Verify results
    expect(result).toBe("Test HTTP Content");
    expect(httpGetMock).toHaveBeenCalled();

    // Clean up
    httpGetMock.mockRestore();
  });

  it("fetches content from HTTPS URLs", async () => {
    // Mock setup
    const mockResponse = {
      statusCode: 200,
      on: vi.fn(),
    };

    // Mock the https.get method
    const httpsGetMock = vi
      .spyOn(https, "get")
      .mockImplementation((url, callback) => {
        mockResponse.on.mockImplementation((event, handler) => {
          if (event === "data") {
            handler(Buffer.from("Test HTTPS Content"));
          }
          if (event === "end") {
            handler();
          }
        });

        callback(mockResponse as any);

        return {
          on: vi.fn(),
          setTimeout: vi.fn(),
        } as any;
      });

    // Test the tool
    const result = await run("https://example.com");

    // Verify results
    expect(result).toBe("Test HTTPS Content");
    expect(httpsGetMock).toHaveBeenCalled();

    // Clean up
    httpsGetMock.mockRestore();
  });

  it("handles error responses", async () => {
    // Mock setup
    const mockResponse = {
      statusCode: 404,
      on: vi.fn(),
    };

    // Mock the https.get method
    const httpsGetMock = vi
      .spyOn(https, "get")
      .mockImplementation((url, callback) => {
        callback(mockResponse as any);

        return {
          on: vi.fn(),
          setTimeout: vi.fn(),
        } as any;
      });

    // Test the tool - should reject with error
    await expect(run("https://example.com/not-found")).rejects.toThrow();

    // Clean up
    httpsGetMock.mockRestore();
  });
});
