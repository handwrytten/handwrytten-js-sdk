/** Shared test helpers — mock fetch factory. */

import type { ApiRecord } from "../src/models.js";

interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface MockCall {
  url: string;
  init: RequestInit;
  parsedBody: unknown;
}

/**
 * Create a mock fetch that returns canned responses and records calls.
 *
 * @param responses - Queue of responses. Each call shifts one off.
 *   If the queue is empty, returns a 200 with `{}`.
 */
export function createMockFetch(responses: MockResponse[] = []) {
  const calls: MockCall[] = [];

  const mockFetch: typeof globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let parsedBody: unknown = undefined;
    if (init?.body) {
      try {
        parsedBody = JSON.parse(init.body as string);
      } catch {
        parsedBody = init.body;
      }
    }
    calls.push({ url, init: init ?? {}, parsedBody });

    const mock = responses.shift() ?? { status: 200, body: {} };

    return new Response(JSON.stringify(mock.body ?? {}), {
      status: mock.status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...(mock.headers ?? {}),
      },
    });
  };

  return { fetch: mockFetch, calls };
}

/** Shorthand: create a Handwrytten client backed by a mock fetch. */
export function createTestClient(responses: MockResponse[] = []) {
  // Lazy import to avoid circular deps at module level
  const { Handwrytten } = require("../src/client.js") as typeof import("../src/client.js");
  const mock = createMockFetch(responses);
  const client = new Handwrytten({
    apiKey: "test-key-123",
    fetch: mock.fetch,
  });
  return { client, ...mock };
}
