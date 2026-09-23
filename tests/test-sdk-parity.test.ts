import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Handwrytten } from "../src/client.js";
import { createMockFetch } from "./helpers.js";
import { DeliveryConfirmation, parseGiftCard, parseUser } from "../src/models.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/sdk-parity.json", import.meta.url), "utf8"));

it("exposes all shared resource methods", () => {
  const { client } = setup([]);
  const found: Record<string, string[]> = {};
  for (const resource of Object.values(client)) {
    const name = resource?.constructor?.name;
    if (!name?.endsWith("Resource")) continue;
    found[name] = Object.getOwnPropertyNames(Object.getPrototypeOf(resource))
      .filter(key => key !== "constructor")
      .map(key => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)).sort();
  }
  const expected = Object.fromEntries(Object.entries(fixture.resource_methods)
    .map(([name, methods]) => [name, [...methods as string[]].sort()]));
  expect(found).toEqual(expected);
});

it.each(fixture.numeric_models)("normalizes $model numeric field from $raw", ({ model, raw, field, expected }) => {
  const parsed = model === "User" ? parseUser(raw) : parseGiftCard(raw);
  expect((parsed as any)[field] ?? null).toBe(expected);
  expect(parsed.raw).toEqual(raw);
});

it("provides compatible delivery-confirmation constant names", () => {
  expect(DeliveryConfirmation.CONFIRMATION).toBe(DeliveryConfirmation.DELIVERY_CONFIRMATION);
  expect(DeliveryConfirmation.CASS_ONLY).toBe(DeliveryConfirmation.CASS_VALIDATION);
});

it.each([undefined, "cover"])("uploads file bytes and image type %s without changing caller FormData", async imageType => {
  const { client, calls } = setup([{ id: 7 }]);
  const form = new FormData();
  form.append("file", new Blob(["image-content"], { type: "image/png" }), "image.png");
  form.append("type", "original");
  const result = await client.customCards.uploadImage({ file: form, imageType });
  const sent = calls[0].init.body as FormData;
  expect(sent.get("type")).toBe(imageType ?? "logo");
  expect(await (sent.get("file") as Blob).text()).toBe("image-content");
  expect((sent.get("file") as File).name).toBe("image.png");
  expect(form.get("type")).toBe("original");
  expect(new Headers(calls[0].init.headers).has("Content-Type")).toBe(false);
  expect(result.id).toBe(7);
});
function setup(bodies: unknown[], oauth = false) {
  const mock = createMockFetch(bodies.map(body => ({ body })));
  const client = new Handwrytten({ ...(oauth ? { accessToken: "test-token" } : { apiKey: "test-key" }), fetch: mock.fetch });
  return { client, ...mock };
}

describe("cross-SDK regression fixtures", () => {
  it.each([false, true])("card dimensions and authentication (OAuth: %s)", async oauth => {
    const { client, calls } = setup([{ status: "ok", card: fixture.card }], oauth);
    const card = await client.cards.get("100");
    expect(card.raw).toEqual(fixture.card);
    expect(card.raw.preview_margin_top).toBe(0);
    const url = new URL(calls[0].url);
    expect(url.pathname + url.search).toBe("/v2/cards/view?card_id=100");
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(oauth ? "Bearer test-token" : "test-key");
  });

  it.each([null, "categories", "results"])("category response %s", async key => {
    const items = [fixture.category];
    const { client } = setup([key ? { [key]: items } : items]);
    const [category] = await client.cards.categories();
    expect(category.raw).toEqual(fixture.category);
    expect(category.metaTitle).toBe(fixture.category.meta_title);
  });

  it.each([null, "countries", "results"])("country enrichment %s", async key => {
    const items = [fixture.country];
    const { client } = setup([key ? { [key]: items } : items]);
    const [country] = await client.addressBook.countries();
    expect(country).toMatchObject({ id: 1, code: "US", deliveryCost: 0.78, aliases: ["USA", "U.S.A.", "US"], raw: fixture.country });
  });

  it.each([null, "stamp_options", "stampOptions", "options", "results"])("stamp response %s", async key => {
    const items = [fixture.stamp];
    const { client } = setup([key ? { [key]: items } : items]);
    const [stamp] = await client.shipping.stampOptions();
    expect(stamp).toMatchObject({ id: 2, name: "Presorted", price: 0.5 });
  });

  it.each([false, true, 0, 1, 2])("delivery confirmation %s", async value => {
    const { client, calls } = setup([{}]);
    await client.basket.addOrder({ cardId: "100", deliveryConfirmation: value });
    expect((calls[0].parsedBody as any).delivery_confirmation).toBe(Number(value));
  });

  it("saved recipient order has the same payload in both SDKs", async () => {
    const { client, calls } = setup([{}, {}]);
    await client.orders.send({ cardId: "100", font: "hwDavid", recipient: [1, 2], sender: 99,
      message: "Hello", wishes: "Best", deliveryConfirmation: 2, stampOptionId: 2 });
    expect(calls[0].parsedBody).toEqual(fixture.saved_order);
  });

  it("copies the default return address into rows, preserving overrides and caller input", async () => {
    const rows = [{ ...fixture.inline }, { ...fixture.inline, return_address_id: 77 }];
    const original = structuredClone(rows);
    const { client, calls } = setup([{}]);
    await client.basket.addOrder({ cardId: "100", addresses: rows, returnAddressId: 99 });
    expect((calls[0].parsedBody as any).addresses.map((row: any) => row.return_address_id)).toEqual([99, 77]);
    expect(rows).toEqual(original);
  });

  it.each([{ rows: [] }, { rows: [fixture.inline] }])("rejects both basket recipient modes before sending: %j", async ({ rows }) => {
    const { client, calls } = setup([]);
    await expect(client.basket.addOrder({ cardId: "100", addresses: rows, addressIds: [] })).rejects.toThrow("not both");
    expect(calls).toHaveLength(0);
  });

  it("retains the QR short response raw fields", async () => {
    const { client } = setup([{ id: 12, status: "ok" }]);
    const qr = await client.qrCodes.create({ name: "Test", url: "https://example.com" });
    expect(qr.raw).toEqual({ id: 12, status: "ok" });
  });
});

describe("Python transport and recipient validation parity", () => {
  it("retains a non-JSON backend error body", async () => {
    const client = new Handwrytten({ apiKey: "test", maxRetries: 1,
      fetch: async () => new Response("Invalid card", { status: 400 }) });
    await expect(client.cards.get("100")).rejects.toMatchObject({ message: "Invalid card", responseBody: "Invalid card", statusCode: 400 });
  });
  it.each([true, false, null, "invalid"])("rejects invalid recipient %j without requests", async recipient => {
    const { client, calls } = setup([]);
    await expect(client.orders.send({ cardId: "100", font: "hwDavid", recipient: recipient as any })).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});

it.each([{ code: "US", expected: "AZ" }, { code: "ca", expected: "ON" }, { code: "XX", expected: null }])("states select $code", async ({code, expected}) => {
  const { client } = setup([{ countries: [fixture.country,
    { id: 2, ups_code: "CA", states: [{ short_name: "ON", name: "Ontario" }] }] }]);
  const states = await client.addressBook.states(code);
  expect(states.map(s => s.code)).toEqual(expected ? [expected] : []);
});
