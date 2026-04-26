import { describe, it, expect } from "vitest";
import { Handwrytten } from "../src/client.js";
import { createMockFetch } from "./helpers.js";

function makeClient(responses: Parameters<typeof createMockFetch>[0]) {
  const mock = createMockFetch(responses);
  const client = new Handwrytten({ apiKey: "test-key", fetch: mock.fetch });
  return { client, ...mock };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe("AuthResource", () => {
  it("getUser returns a User", async () => {
    const { client } = makeClient([{ body: { id: 42, email: "a@b.com", first_name: "Jane" } }]);
    const user = await client.auth.getUser();
    expect(user.id).toBe("42");
    expect(user.email).toBe("a@b.com");
    expect(user.firstName).toBe("Jane");
  });

  it("login sends email and password", async () => {
    const { client, calls } = makeClient([{ body: { uid: "abc" } }]);
    const result = await client.auth.login("a@b.com", "pass");
    expect(calls[0].parsedBody).toEqual({ login: "a@b.com", password: "pass" });
    expect(result).toEqual({ uid: "abc" });
  });

  it("listSignatures returns Signature[]", async () => {
    const { client } = makeClient([{
      body: { signatures: [{ id: 1, preview: "https://x.com/sig.png" }, { id: 2 }] },
    }]);
    const sigs = await client.auth.listSignatures();
    expect(sigs).toHaveLength(2);
    expect(sigs[0].id).toBe(1);
    expect(sigs[0].preview).toBe("https://x.com/sig.png");
  });

  it("listSignatures handles list response", async () => {
    const { client } = makeClient([{ body: [{ id: 1, preview: "x" }] }]);
    const sigs = await client.auth.listSignatures();
    expect(sigs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

describe("CardsResource", () => {
  it("list returns Card[]", async () => {
    const { client } = makeClient([{ body: [{ id: 1, title: "Card 1" }] }]);
    const cards = await client.cards.list();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("1");
    expect(cards[0].title).toBe("Card 1");
  });

  it("list handles wrapped response", async () => {
    const { client } = makeClient([{ body: { results: [{ id: 2, title: "C" }] } }]);
    const cards = await client.cards.list();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("2");
  });

  it("get returns a single Card", async () => {
    const { client, calls } = makeClient([{ body: { id: 100, title: "TY" } }]);
    const card = await client.cards.get("100");
    expect(card.id).toBe("100");
    expect(calls[0].url).toContain("cards/get/100");
  });

  it("categories returns list", async () => {
    const { client } = makeClient([{ body: [{ id: 1, name: "Cat1" }] }]);
    const cats = await client.cards.categories();
    expect(cats).toHaveLength(1);
  });

  it("categories unwraps {categories: [...]} envelope", async () => {
    const { client, calls } = makeClient([{
      body: { httpCode: 200, status: "ok", categories: [{ id: 1, name: "Cat1" }, { id: 2, name: "Cat2" }] },
    }]);
    const cats = await client.cards.categories();
    expect(cats).toHaveLength(2);
    expect(cats[0]).toMatchObject({ id: 1, name: "Cat1" });
    expect(calls[0].url).toContain("categories/list");
  });

  it("categories converts snake_case fields to camelCase", async () => {
    const { client } = makeClient([{
      body: {
        categories: [{
          id: 462,
          name: "Anniversary",
          slug: "anniversary",
          taxonomy: "NONE",
          meta_title: "Celebrate Your Anniversary",
          meta_description: "Anniversary cards",
          checked: 1,
          icon: "https://cdn.example.com/icon.png",
        }],
      },
    }]);
    const cats = await client.cards.categories();
    expect(cats[0]).toMatchObject({
      id: 462,
      name: "Anniversary",
      slug: "anniversary",
      taxonomy: "NONE",
      metaTitle: "Celebrate Your Anniversary",
      metaDescription: "Anniversary cards",
      checked: 1,
      icon: "https://cdn.example.com/icon.png",
    });
    // Original snake_case payload preserved on .raw for escape hatches
    expect(cats[0].raw.meta_title).toBe("Celebrate Your Anniversary");
  });
});

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

describe("FontsResource", () => {
  it("list returns Font[]", async () => {
    const { client } = makeClient([{ body: [{ id: 1, name: "hw1", label: "Font 1" }] }]);
    const fonts = await client.fonts.list();
    expect(fonts).toHaveLength(1);
    expect(fonts[0].name).toBe("hw1");
  });

  it("listForCustomizer returns raw list", async () => {
    const { client } = makeClient([{ body: { fonts: [{ id: 1, label: "Arial" }] } }]);
    const fonts = await client.fonts.listForCustomizer();
    expect(fonts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Gift Cards
// ---------------------------------------------------------------------------

describe("GiftCardsResource", () => {
  it("list returns GiftCard[]", async () => {
    const { client } = makeClient([{ body: [{ id: 1, title: "Amazon", amount: 25 }] }]);
    const gcs = await client.giftCards.list();
    expect(gcs).toHaveLength(1);
    expect(gcs[0].amount).toBe(25);
  });

  it("list extracts from gcards key", async () => {
    const { client } = makeClient([{
      body: {
        gcards: [{
          id: 1,
          title: "Amazon",
          denominations: [
            { id: 10, nominal: 25, price: 27.5 },
            { id: 11, nominal: 50, price: 55 },
          ],
        }],
      },
    }]);
    const gcs = await client.giftCards.list();
    expect(gcs).toHaveLength(1);
    expect(gcs[0].denominations).toHaveLength(2);
    expect(gcs[0].denominations[0].nominal).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Inserts
// ---------------------------------------------------------------------------

describe("InsertsResource", () => {
  it("list returns Insert[]", async () => {
    const { client } = makeClient([{ body: [{ id: 1, title: "Flyer" }] }]);
    const inserts = await client.inserts.list();
    expect(inserts).toHaveLength(1);
    expect(inserts[0].title).toBe("Flyer");
  });

  it("list extracts from inserts key", async () => {
    const { client } = makeClient([{ body: { inserts: [{ id: 1, title: "Flyer" }] } }]);
    const inserts = await client.inserts.list();
    expect(inserts).toHaveLength(1);
  });

  it("list passes includeHistorical", async () => {
    const { client, calls } = makeClient([{ body: [] }]);
    await client.inserts.list({ includeHistorical: true });
    expect(calls[0].url).toContain("include_historical=1");
  });
});

// ---------------------------------------------------------------------------
// QR Codes
// ---------------------------------------------------------------------------

describe("QRCodesResource", () => {
  it("list handles {list: [...]} response", async () => {
    const { client } = makeClient([{ body: { list: [{ id: 1, url: "http://qr" }] } }]);
    const qrs = await client.qrCodes.list();
    expect(qrs).toHaveLength(1);
    expect(qrs[0].url).toBe("http://qr");
  });

  it("create sends correct body", async () => {
    const { client, calls } = makeClient([{ body: { id: 10 } }]);
    const qr = await client.qrCodes.create({ name: "My QR", url: "https://test.com" });
    expect(calls[0].parsedBody).toEqual({ name: "My QR", url: "https://test.com" });
    expect(qr.id).toBe("10");
    expect(qr.url).toBe("https://test.com");
  });

  it("delete calls correct endpoint", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.qrCodes.delete(5);
    expect(calls[0].url).toContain("qrCode/5/");
    expect(calls[0].init.method).toBe("DELETE");
  });

  it("frames returns list", async () => {
    const { client } = makeClient([{ body: { frames: [{ id: 1, type: "circle" }] } }]);
    const frames = await client.qrCodes.frames();
    expect(frames).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Address Book
// ---------------------------------------------------------------------------

describe("AddressBookResource", () => {
  it("listRecipients returns SavedAddress[]", async () => {
    const { client } = makeClient([{
      body: { addresses: [{ id: 1, first_name: "Jane", address1: "123 Main" }] },
    }]);
    const addrs = await client.addressBook.listRecipients();
    expect(addrs).toHaveLength(1);
    expect(addrs[0].firstName).toBe("Jane");
  });

  it("addRecipient sends correct fields", async () => {
    const { client, calls } = makeClient([{ body: { address: { id: 99 } } }]);
    const id = await client.addressBook.addRecipient({
      firstName: "Jane",
      lastName: "Doe",
      street1: "123 Main",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      company: "Acme",
    });
    expect(id).toBe(99);
    expect(calls[0].parsedBody).toMatchObject({
      first_name: "Jane",
      last_name: "Doe",
      address1: "123 Main",
      business_name: "Acme",
    });
  });

  it("updateRecipient sends correct fields", async () => {
    const { client, calls } = makeClient([{ body: { address: { id: 50 } } }]);
    const id = await client.addressBook.updateRecipient({
      addressId: 50,
      street1: "456 New St",
    });
    expect(id).toBe(50);
    expect(calls[0].parsedBody).toMatchObject({ id: 50, address1: "456 New St" });
    expect(calls[0].init.method).toBe("PUT");
  });

  it("listSenders handles triple-s key", async () => {
    const { client } = makeClient([{
      body: { addressses: [{ id: 1, first_name: "David" }] },
    }]);
    const senders = await client.addressBook.listSenders();
    expect(senders).toHaveLength(1);
    expect(senders[0].firstName).toBe("David");
  });

  it("addSender sends correct fields", async () => {
    const { client, calls } = makeClient([{ body: { address: { id: 77 } } }]);
    const id = await client.addressBook.addSender({
      firstName: "David",
      lastName: "Wachs",
      street1: "100 S Mill Ave",
      city: "Tempe",
      state: "AZ",
      zip: "85281",
    });
    expect(id).toBe(77);
    expect(calls[0].url).toContain("profile/createAddress");
  });

  it("deleteRecipient sends address_id", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.addressBook.deleteRecipient({ addressId: 123 });
    expect(calls[0].parsedBody).toMatchObject({ address_id: 123 });
    expect(calls[0].url).toContain("profile/deleteRecipient");
  });

  it("deleteRecipient sends address_ids", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.addressBook.deleteRecipient({ addressIds: [1, 2, 3] });
    expect(calls[0].parsedBody).toMatchObject({ address_ids: [1, 2, 3] });
  });

  it("deleteSender sends address_id", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.addressBook.deleteSender({ addressId: 456 });
    expect(calls[0].parsedBody).toMatchObject({ address_id: 456 });
    expect(calls[0].url).toContain("profile/deleteAddress");
  });

  it("deleteSender sends address_ids", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.addressBook.deleteSender({ addressIds: [7, 8, 9] });
    expect(calls[0].parsedBody).toMatchObject({ address_ids: [7, 8, 9] });
  });

  it("countries returns Country[]", async () => {
    const { client } = makeClient([{ body: [{ code: "US", name: "United States" }] }]);
    const countries = await client.addressBook.countries();
    expect(countries).toHaveLength(1);
    expect(countries[0].code).toBe("US");
  });

  it("states returns State[]", async () => {
    const { client, calls } = makeClient([{ body: [{ code: "AZ", name: "Arizona" }] }]);
    const states = await client.addressBook.states("US");
    expect(states).toHaveLength(1);
    expect(calls[0].url).toContain("country=US");
  });
});

// ---------------------------------------------------------------------------
// Custom Cards
// ---------------------------------------------------------------------------

describe("CustomCardsResource", () => {
  it("dimensions returns Dimension[]", async () => {
    const { client } = makeClient([{
      body: { dimensions: [{ id: 1, orientation: "landscape", format: "flat", open_width: "5", open_height: "7" }] },
    }]);
    const dims = await client.customCards.dimensions();
    expect(dims).toHaveLength(1);
    expect(dims[0].format).toBe("flat");
  });

  it("dimensions filters by format", async () => {
    const { client } = makeClient([{
      body: {
        dimensions: [
          { id: 1, orientation: "landscape", format: "flat", open_width: "5", open_height: "7" },
          { id: 2, orientation: "portrait", format: "folded", open_width: "4", open_height: "6" },
        ],
      },
    }]);
    const dims = await client.customCards.dimensions({ format: "flat" });
    expect(dims).toHaveLength(1);
    expect(dims[0].id).toBe(1);
  });

  it("uploadImage sends url", async () => {
    const { client, calls } = makeClient([{ body: { id: 42, src: "http://img" } }]);
    const img = await client.customCards.uploadImage({ url: "http://example.com/img.jpg" });
    expect(img.id).toBe(42);
    expect(calls[0].parsedBody).toMatchObject({ url: "http://example.com/img.jpg", type: "logo" });
  });

  it("uploadImage requires url or file", async () => {
    const { client } = makeClient([]);
    await expect(client.customCards.uploadImage({})).rejects.toThrow("Provide either url or file");
  });

  it("checkImage sends image_id", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.customCards.checkImage(42);
    expect(calls[0].parsedBody).toMatchObject({ image_id: 42 });
  });

  it("listImages returns CustomImage[]", async () => {
    const { client } = makeClient([{ body: { images: [{ id: 1, src: "http://x" }] } }]);
    const images = await client.customCards.listImages();
    expect(images).toHaveLength(1);
    expect(images[0].imageUrl).toBe("http://x");
  });

  it("create sends correct body", async () => {
    const { client, calls } = makeClient([{ body: { card_id: 88, category_id: 5 } }]);
    const card = await client.customCards.create({
      name: "My Card",
      dimensionId: "1",
      coverId: 42,
      headerType: "text",
      headerText: "ACME Corp",
    });
    expect(card.cardId).toBe(88);
    expect(calls[0].parsedBody).toMatchObject({
      name: "My Card",
      dimension_id: "1",
      cover_id: 42,
      header_type: "text",
      header_text: "ACME Corp",
    });
  });

  it("get returns a CustomCard", async () => {
    const { client, calls } = makeClient([{ body: { card_id: 999, category_id: 5 } }]);
    const card = await client.customCards.get(999);
    expect(card.cardId).toBe(999);
    expect(card.categoryId).toBe(5);
    expect(calls[0].url).toContain("design/getCustomCard");
    expect(calls[0].url).toContain("id=999");
  });

  it("delete sends card id", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.customCards.delete(88);
    expect(calls[0].parsedBody).toMatchObject({ id: 88 });
  });
});

// ---------------------------------------------------------------------------
// Basket
// ---------------------------------------------------------------------------

describe("BasketResource", () => {
  it("addOrder sends correct body", async () => {
    const { client, calls } = makeClient([{ body: { order_id: 123 } }]);
    await client.basket.addOrder({
      cardId: "3404",
      message: "Hello!",
      font: "hwDavid",
      addresses: [{
        firstName: "Jane",
        lastName: "Doe",
        street1: "123 Main",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
      }],
    });
    const body = calls[0].parsedBody as Record<string, unknown>;
    expect(body.card_id).toBe(3404);
    expect(body.message).toBe("Hello!");
    expect(body.font).toBe("hwDavid");
    const addrs = body.addresses as Record<string, string>[];
    expect(addrs[0].to_first_name).toBe("Jane");
    expect(addrs[0].to_city).toBe("Phoenix");
  });

  it("addOrder passes through to_* addresses", async () => {
    const { client, calls } = makeClient([{ body: { order_id: 1 } }]);
    await client.basket.addOrder({
      cardId: "100",
      addresses: [{ to_first_name: "Jane", to_city: "Phoenix" }],
    });
    const body = calls[0].parsedBody as Record<string, unknown>;
    const addrs = body.addresses as Record<string, string>[];
    expect(addrs[0].to_first_name).toBe("Jane");
  });

  it("addOrder passes through address_id addresses", async () => {
    const { client, calls } = makeClient([{ body: { order_id: 1 } }]);
    await client.basket.addOrder({
      cardId: "100",
      addresses: [{ address_id: 42 }],
    });
    const body = calls[0].parsedBody as Record<string, unknown>;
    const addrs = body.addresses as Record<string, unknown>[];
    expect(addrs[0].address_id).toBe(42);
  });

  it("send sends basket", async () => {
    const { client, calls } = makeClient([{ body: { status: "ok" } }]);
    await client.basket.send({ couponCode: "SAVE10", creditCardId: 5 });
    const body = calls[0].parsedBody as Record<string, unknown>;
    expect(body.couponCode).toBe("SAVE10");
    expect(body.credit_card_id).toBe(5);
    expect(calls[0].url).toContain("basket/send");
  });

  it("remove sends basket id", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.basket.remove(123);
    expect(calls[0].parsedBody).toMatchObject({ id: 123 });
  });

  it("clear sends empty body", async () => {
    const { client, calls } = makeClient([{ body: { ok: true } }]);
    await client.basket.clear();
    expect(calls[0].url).toContain("basket/clear");
  });

  it("list calls basket/allNew", async () => {
    const { client, calls } = makeClient([{ body: { items: [] } }]);
    await client.basket.list();
    expect(calls[0].url).toContain("basket/allNew");
  });

  it("count returns number", async () => {
    const { client } = makeClient([{ body: { count: 3 } }]);
    const count = await client.basket.count();
    expect(count).toBe(3);
  });

  it("addOrder serializes delivery_confirmation as int", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { order_id: 2 } },
      { body: { order_id: 3 } },
    ]);
    await client.basket.addOrder({ cardId: "1", deliveryConfirmation: 0 });
    await client.basket.addOrder({ cardId: "1", deliveryConfirmation: 1 });
    await client.basket.addOrder({ cardId: "1", deliveryConfirmation: 2 });
    expect((calls[0].parsedBody as Record<string, unknown>).delivery_confirmation).toBe(0);
    expect((calls[1].parsedBody as Record<string, unknown>).delivery_confirmation).toBe(1);
    expect((calls[2].parsedBody as Record<string, unknown>).delivery_confirmation).toBe(2);
  });

  it("addOrder passes stamp_option_id", async () => {
    const { client, calls } = makeClient([{ body: { order_id: 1 } }]);
    await client.basket.addOrder({ cardId: "1", stampOptionId: 7 });
    expect((calls[0].parsedBody as Record<string, unknown>).stamp_option_id).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

describe("OrdersResource", () => {
  it("send with dict recipient", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },   // placeBasket
      { body: { status: "ok" } },   // basket/send
    ]);
    await client.orders.send({
      cardId: "3404",
      font: "hwDavid",
      message: "Hello!",
      recipient: {
        firstName: "Jane",
        lastName: "Doe",
        street1: "123 Main",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
      },
    });
    // First call is placeBasket
    expect(calls[0].url).toContain("orders/placeBasket");
    const placeBody = calls[0].parsedBody as Record<string, unknown>;
    const addrs = placeBody.addresses as Record<string, unknown>[];
    expect(addrs[0]).toMatchObject({
      to_first_name: "Jane",
      to_address1: "123 Main",
      message: "Hello!",
    });
    // Second call is basket/send
    expect(calls[1].url).toContain("basket/send");
  });

  it("send with int recipient routes to address_ids", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: 12345,
    });
    const placeBody = calls[0].parsedBody as Record<string, unknown>;
    expect(placeBody.address_ids).toEqual([12345]);
    expect(placeBody.addresses).toBeUndefined();
    // Top-level message is forwarded so placeBasket can apply it to address_ids rows.
    expect(placeBody.message).toBe("Hi");
  });

  it("send with sender dict applies from_* fields", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: { firstName: "Jane", lastName: "Doe", street1: "123 Main", city: "Phoenix", state: "AZ", zip: "85001" },
      sender: { firstName: "David", lastName: "Wachs", street1: "100 S Mill", city: "Tempe", state: "AZ", zip: "85281" },
    });
    const addrs = (calls[0].parsedBody as Record<string, unknown>).addresses as Record<string, string>[];
    expect(addrs[0].from_first_name).toBe("David");
    expect(addrs[0].from_address1).toBe("100 S Mill");
  });

  it("send with int sender sets return_address_id", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: 67890,
      sender: 12345,
    });
    const placeBody = calls[0].parsedBody as Record<string, unknown>;
    expect(placeBody.return_address_id).toBe(12345);
  });

  it("send rejects mixed arrays of IDs and inline addresses", async () => {
    const { client } = makeClient([]);
    await expect(
      client.orders.send({
        cardId: "100",
        font: "hwDavid",
        message: "Default msg",
        recipient: [
          { firstName: "A", lastName: "B", street1: "1 St", city: "X", state: "AZ", zip: "00000" },
          99999,
        ],
      }),
    ).rejects.toThrow(/all saved-address IDs.*or all inline/);
  });

  it("send bulk all-numeric routes to address_ids", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Default msg",
      recipient: [111, 222, 333],
    });
    const placeBody = calls[0].parsedBody as Record<string, unknown>;
    expect(placeBody.address_ids).toEqual([111, 222, 333]);
    expect(placeBody.addresses).toBeUndefined();
    expect(placeBody.message).toBe("Default msg");
  });

  it("send passes coupon to both steps", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: 1,
      couponCode: "SAVE10",
    });
    const placeBody = calls[0].parsedBody as Record<string, unknown>;
    expect(placeBody.couponCode).toBe("SAVE10");
    const sendBody = calls[1].parsedBody as Record<string, unknown>;
    expect(sendBody.couponCode).toBe("SAVE10");
  });

  it("send with per-recipient overrides", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Default",
      recipient: [
        {
          firstName: "A", lastName: "B", street1: "1 St", city: "X", state: "AZ", zip: "00000",
          message: "Custom A",
        },
        {
          firstName: "C", lastName: "D", street1: "2 St", city: "Y", state: "AZ", zip: "00000",
        },
      ],
    });
    const addrs = (calls[0].parsedBody as Record<string, unknown>).addresses as Record<string, unknown>[];
    expect(addrs[0].message).toBe("Custom A");
    expect(addrs[1].message).toBe("Default"); // gets default
  });

  it("get returns an Order", async () => {
    const { client, calls } = makeClient([{ body: { id: 999, status: "pending" } }]);
    const order = await client.orders.get("999");
    expect(order.id).toBe("999");
    expect(order.status).toBe("pending");
    expect(calls[0].url).toContain("orders/get/999");
  });

  it("list returns Order[]", async () => {
    const { client, calls } = makeClient([{ body: [{ id: 1 }, { id: 2 }] }]);
    const orders = await client.orders.list({ page: 2, perPage: 10 });
    expect(orders).toHaveLength(2);
    expect(calls[0].url).toContain("page=2");
    expect(calls[0].url).toContain("per_page=10");
  });

  it("listPastBaskets returns baskets", async () => {
    const { client } = makeClient([{
      body: { baskets: [{ id: 1, total: 5.99 }, { id: 2, total: 3.5 }] },
    }]);
    const baskets = await client.orders.listPastBaskets();
    expect(baskets).toHaveLength(2);
    expect(baskets[0].total).toBe(5.99);
  });

  it("listPastBaskets passes page", async () => {
    const { client, calls } = makeClient([{ body: { baskets: [] } }]);
    await client.orders.listPastBaskets({ page: 3 });
    expect(calls[0].url).toContain("page=3");
  });

  it("send forwards delivery_confirmation as int", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: 1,
      deliveryConfirmation: 2,
    });
    expect((calls[0].parsedBody as Record<string, unknown>).delivery_confirmation).toBe(2);
  });

  it("send forwards stamp_option_id", async () => {
    const { client, calls } = makeClient([
      { body: { order_id: 1 } },
      { body: { status: "ok" } },
    ]);
    await client.orders.send({
      cardId: "100",
      font: "hwDavid",
      message: "Hi",
      recipient: 1,
      stampOptionId: 3,
    });
    expect((calls[0].parsedBody as Record<string, unknown>).stamp_option_id).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Prospecting
// ---------------------------------------------------------------------------

describe("ProspectingResource", () => {
  it("calculateTargets sends correct body", async () => {
    const { client, calls } = makeClient([{ body: { targets: 500 } }]);
    const result = await client.prospecting.calculateTargets({ zipCode: "85281", radiusMiles: 5 });
    expect(calls[0].parsedBody).toMatchObject({ zip: "85281", radius: 5 });
    expect((result as Record<string, unknown>).targets).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

describe("ShippingResource", () => {
  it("stampOptions returns StampOption[]", async () => {
    const { client, calls } = makeClient([
      {
        body: [
          { id: 1, name: "First Class", price: 0.73 },
          { id: 2, name: "Presorted", price: 0.55 },
        ],
      },
    ]);
    const opts = await client.shipping.stampOptions();
    expect(calls[0].url).toContain("shipping/stampOptions");
    expect(opts).toHaveLength(2);
    expect(opts[0].id).toBe(1);
    expect(opts[0].name).toBe("First Class");
    expect(opts[1].price).toBe(0.55);
  });

  it("stampOptions extracts from stamp_options key", async () => {
    const { client } = makeClient([{
      body: { stamp_options: [{ id: 5, name: "Custom" }] },
    }]);
    const opts = await client.shipping.stampOptions();
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe(5);
  });
});
