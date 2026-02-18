import { describe, it, expect } from "vitest";
import { HttpClient, DEFAULT_BASE_URL } from "../src/http-client.js";
import {
  AuthenticationError,
  BadRequestError,
  HandwryttenError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "../src/errors.js";
import { createMockFetch } from "./helpers.js";

function makeClient(responses: Parameters<typeof createMockFetch>[0] = []) {
  const mock = createMockFetch(responses);
  const client = new HttpClient({
    apiKey: "test-key",
    fetch: mock.fetch,
    maxRetries: 1, // don't retry during tests by default
  });
  return { client, ...mock };
}

describe("HttpClient construction", () => {
  it("sets default values", () => {
    const { client } = makeClient();
    expect(client.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(client.timeout).toBe(30_000);
    expect(client.maxRetries).toBe(1);
    expect(client.apiKey).toBe("test-key");
  });

  it("normalises trailing slash on baseUrl", () => {
    const mock = createMockFetch();
    const client = new HttpClient({
      apiKey: "k",
      baseUrl: "https://api.test.com/v2",
      fetch: mock.fetch,
    });
    expect(client.baseUrl).toBe("https://api.test.com/v2/");
  });
});

describe("HttpClient request methods", () => {
  it("sends GET with query params", async () => {
    const { client, calls } = makeClient([{ body: [{ id: 1 }] }]);
    const result = await client.get("cards/list", { page: 1, per_page: 50 });
    expect(result).toEqual([{ id: 1 }]);
    expect(calls[0].url).toContain("cards/list");
    expect(calls[0].url).toContain("page=1");
    expect(calls[0].url).toContain("per_page=50");
    expect(calls[0].init.method).toBe("GET");
  });

  it("sends POST with JSON body", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.post("orders/placeBasket", { card_id: 100 });
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].parsedBody).toEqual({ card_id: 100 });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends PUT with JSON body", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.put("profile/updateRecipient", { id: 1 });
    expect(calls[0].init.method).toBe("PUT");
    expect(calls[0].parsedBody).toEqual({ id: 1 });
  });

  it("sends DELETE", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.delete("qrCode/1/");
    expect(calls[0].init.method).toBe("DELETE");
  });

  it("includes Authorization header", async () => {
    const { client, calls } = makeClient([{ body: {} }]);
    await client.get("auth/getUser");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("test-key");
  });

  it("includes idempotency key header", async () => {
    const { client, calls } = makeClient([{ body: {} }]);
    await client.post("orders/placeBasket", {}, "idem-123");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("idem-123");
  });
});

describe("Error handling", () => {
  it("401 raises AuthenticationError", async () => {
    const { client } = makeClient([{ status: 401, body: { message: "Unauthorized" } }]);
    await expect(client.get("auth/getUser")).rejects.toThrow(AuthenticationError);
  });

  it("403 raises AuthenticationError", async () => {
    const { client } = makeClient([{ status: 403, body: { message: "Forbidden" } }]);
    await expect(client.get("test")).rejects.toThrow(AuthenticationError);
  });

  it("404 raises NotFoundError", async () => {
    const { client } = makeClient([{ status: 404, body: { message: "Not found" } }]);
    await expect(client.get("orders/get/999")).rejects.toThrow(NotFoundError);
  });

  it("400 raises BadRequestError", async () => {
    const { client } = makeClient([{ status: 400, body: { message: "Bad request" } }]);
    await expect(client.post("orders/placeBasket", {})).rejects.toThrow(BadRequestError);
  });

  it("429 raises RateLimitError with retryAfter", async () => {
    const { client } = makeClient([
      { status: 429, body: {}, headers: { "Retry-After": "5" } },
    ]);
    try {
      await client.get("test");
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).retryAfter).toBe(5);
    }
  });

  it("500 raises ServerError", async () => {
    const { client } = makeClient([{ status: 500, body: { error: "Internal" } }]);
    await expect(client.get("test")).rejects.toThrow(ServerError);
  });

  it("extracts error message from response body", async () => {
    const { client } = makeClient([{ status: 400, body: { message: "Card ID required" } }]);
    try {
      await client.post("orders/placeBasket", {});
    } catch (e) {
      expect((e as BadRequestError).message).toBe("Card ID required");
    }
  });

  it("extracts error from 'errors' array", async () => {
    const { client } = makeClient([{ status: 400, body: { errors: ["First error"] } }]);
    try {
      await client.post("test", {});
    } catch (e) {
      expect((e as BadRequestError).message).toBe("First error");
    }
  });
});

describe("Retries", () => {
  it("retries on 500 then succeeds", async () => {
    const mock = createMockFetch([
      { status: 500, body: { error: "fail" } },
      { status: 200, body: { ok: true } },
    ]);
    const client = new HttpClient({
      apiKey: "k",
      fetch: mock.fetch,
      maxRetries: 2,
    });
    const result = await client.get("test");
    expect(result).toEqual({ ok: true });
    expect(mock.calls.length).toBe(2);
  });

  it("retries on 429 then succeeds", async () => {
    const mock = createMockFetch([
      { status: 429, body: {} },
      { status: 200, body: { ok: true } },
    ]);
    const client = new HttpClient({
      apiKey: "k",
      fetch: mock.fetch,
      maxRetries: 2,
    });
    const result = await client.get("test");
    expect(result).toEqual({ ok: true });
    expect(mock.calls.length).toBe(2);
  });

  it("throws after exhausting retries", async () => {
    const mock = createMockFetch([
      { status: 500, body: {} },
      { status: 500, body: {} },
    ]);
    const client = new HttpClient({
      apiKey: "k",
      fetch: mock.fetch,
      maxRetries: 2,
    });
    await expect(client.get("test")).rejects.toThrow(ServerError);
    expect(mock.calls.length).toBe(2);
  });

  it("does not retry on 400", async () => {
    const mock = createMockFetch([
      { status: 400, body: { message: "bad" } },
    ]);
    const client = new HttpClient({
      apiKey: "k",
      fetch: mock.fetch,
      maxRetries: 3,
    });
    await expect(client.get("test")).rejects.toThrow(BadRequestError);
    expect(mock.calls.length).toBe(1);
  });
});
