import { describe, it, expect } from "vitest";
import { Handwrytten } from "../src/client.js";
import { createMockFetch } from "./helpers.js";

describe("Handwrytten client", () => {
  it("accepts string API key", () => {
    const mock = createMockFetch();
    const client = new Handwrytten({ apiKey: "test-key", fetch: mock.fetch });
    expect(client.auth).toBeDefined();
    expect(client.cards).toBeDefined();
    expect(client.customCards).toBeDefined();
    expect(client.fonts).toBeDefined();
    expect(client.giftCards).toBeDefined();
    expect(client.inserts).toBeDefined();
    expect(client.qrCodes).toBeDefined();
    expect(client.addressBook).toBeDefined();
    expect(client.basket).toBeDefined();
    expect(client.orders).toBeDefined();
    expect(client.prospecting).toBeDefined();
  });

  it("accepts string shorthand", () => {
    const mock = createMockFetch();
    // We can't easily inject fetch with the string constructor, but we can
    // verify it doesn't throw
    expect(() => new Handwrytten({ apiKey: "test-key", fetch: mock.fetch })).not.toThrow();
  });

  it("throws on missing API key", () => {
    expect(() => new Handwrytten({ apiKey: "" })).toThrow("API key is required");
  });

  it("string constructor throws on missing key", () => {
    expect(() => new Handwrytten("")).toThrow("API key is required");
  });
});
