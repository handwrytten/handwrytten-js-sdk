import { describe, it, expect } from "vitest";
import {
  parseUser,
  parseCard,
  parseFont,
  parseDenomination,
  parseGiftCard,
  parseInsert,
  parseQRCode,
  parseOrder,
  parseDimension,
  parseCustomImage,
  parseCustomCard,
  parseSavedAddress,
  parseSignature,
  parseStampOption,
  parseCountry,
  parseState,
  ZoneType,
  QRCodeLocation,
  DeliveryConfirmation,
} from "../src/models.js";

describe("parseUser", () => {
  it("parses a user from API data", () => {
    const user = parseUser({ id: 42, email: "a@b.com", first_name: "Jane", last_name: "Doe", credits: 100 });
    expect(user.id).toBe("42");
    expect(user.email).toBe("a@b.com");
    expect(user.firstName).toBe("Jane");
    expect(user.lastName).toBe("Doe");
    expect(user.credits).toBe(100);
  });

  it("falls back to uid", () => {
    expect(parseUser({ uid: "abc" }).id).toBe("abc");
  });

  it("handles camelCase keys", () => {
    const user = parseUser({ id: 1, firstName: "Jim", lastName: "B" });
    expect(user.firstName).toBe("Jim");
  });
});

describe("parseCard", () => {
  it("parses card data", () => {
    const card = parseCard({ id: 100, title: "Thank You", image_url: "http://img", category: "cat1" });
    expect(card.id).toBe("100");
    expect(card.title).toBe("Thank You");
    expect(card.imageUrl).toBe("http://img");
    expect(card.category).toBe("cat1");
  });

  it("falls back to name for title", () => {
    expect(parseCard({ id: 1, name: "Card Name" }).title).toBe("Card Name");
  });
});

describe("parseFont", () => {
  it("parses font data", () => {
    const font = parseFont({ id: 5, name: "hw1", label: "Handwriting 1", preview_url: "http://prev" });
    expect(font.id).toBe("5");
    expect(font.name).toBe("hw1");
    expect(font.label).toBe("Handwriting 1");
    expect(font.previewUrl).toBe("http://prev");
  });
});

describe("parseDenomination", () => {
  it("parses denomination data", () => {
    const d = parseDenomination({ id: 10, nominal: 25, price: 27.5 });
    expect(d.id).toBe(10);
    expect(d.nominal).toBe(25);
    expect(d.price).toBe(27.5);
  });

  it("defaults to zeros", () => {
    const d = parseDenomination({});
    expect(d.id).toBe(0);
    expect(d.nominal).toBe(0);
    expect(d.price).toBe(0);
  });
});

describe("parseGiftCard", () => {
  it("parses gift card data", () => {
    const gc = parseGiftCard({ id: 10, title: "Amazon", amount: 25 });
    expect(gc.id).toBe("10");
    expect(gc.title).toBe("Amazon");
    expect(gc.amount).toBe(25);
  });

  it("falls back to value for amount", () => {
    expect(parseGiftCard({ id: 1, title: "X", value: 50 }).amount).toBe(50);
  });

  it("parses denominations", () => {
    const gc = parseGiftCard({
      id: 5,
      title: "Amazon",
      denominations: [
        { id: 1, nominal: 25, price: 27.5 },
        { id: 2, nominal: 50, price: 55 },
      ],
    });
    expect(gc.denominations).toHaveLength(2);
    expect(gc.denominations[0].nominal).toBe(25);
    expect(gc.denominations[1].price).toBe(55);
  });

  it("defaults to empty denominations", () => {
    const gc = parseGiftCard({ id: 1, title: "X" });
    expect(gc.denominations).toEqual([]);
  });

  it("ignores non-array denominations", () => {
    const gc = parseGiftCard({ id: 1, title: "X", denominations: "invalid" });
    expect(gc.denominations).toEqual([]);
  });
});

describe("parseInsert", () => {
  it("parses insert data", () => {
    const ins = parseInsert({ id: 3, title: "Flyer", image_url: "http://fly" });
    expect(ins.id).toBe("3");
    expect(ins.title).toBe("Flyer");
    expect(ins.imageUrl).toBe("http://fly");
  });
});

describe("parseQRCode", () => {
  it("parses QR code data", () => {
    const qr = parseQRCode({ id: 7, url: "https://qr.com", title: "My QR" });
    expect(qr.id).toBe("7");
    expect(qr.url).toBe("https://qr.com");
    expect(qr.title).toBe("My QR");
  });
});

describe("parseOrder", () => {
  it("parses order data", () => {
    const order = parseOrder({
      id: 999,
      status: "pending",
      message: "Hello",
      card_id: 100,
      font_id: 5,
      created_at: "2024-01-01",
      tracking_number: "TRK123",
    });
    expect(order.id).toBe("999");
    expect(order.status).toBe("pending");
    expect(order.message).toBe("Hello");
    expect(order.cardId).toBe("100");
    expect(order.fontId).toBe("5");
    expect(order.createdAt).toBe("2024-01-01");
    expect(order.trackingNumber).toBe("TRK123");
  });

  it("falls back to order_id", () => {
    expect(parseOrder({ order_id: "abc" }).id).toBe("abc");
  });
});

describe("parseDimension", () => {
  it("parses dimension data", () => {
    const dim = parseDimension({
      id: 1,
      orientation: "landscape",
      format: "flat",
      open_width: "5",
      open_height: "7",
      name: "5x7",
    });
    expect(dim.id).toBe(1);
    expect(dim.orientation).toBe("landscape");
    expect(dim.format).toBe("flat");
    expect(dim.openWidth).toBe("5");
    expect(dim.openHeight).toBe("7");
    expect(dim.name).toBe("5x7");
  });
});

describe("parseCustomImage", () => {
  it("parses custom image data", () => {
    const img = parseCustomImage({ id: 42, src: "http://img.jpg", type: "logo" });
    expect(img.id).toBe(42);
    expect(img.imageUrl).toBe("http://img.jpg");
    expect(img.imageType).toBe("logo");
  });
});

describe("parseCustomCard", () => {
  it("parses custom card data", () => {
    const cc = parseCustomCard({ card_id: 88, category_id: 5 });
    expect(cc.cardId).toBe(88);
    expect(cc.categoryId).toBe(5);
  });

  it("falls back to id for card_id", () => {
    expect(parseCustomCard({ id: 77 }).cardId).toBe(77);
  });
});

describe("parseSavedAddress", () => {
  it("parses saved address data", () => {
    const addr = parseSavedAddress({
      id: 10,
      first_name: "Jane",
      last_name: "Doe",
      business_name: "Acme",
      address1: "123 Main",
      address2: "Apt 4",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      country: "US",
    });
    expect(addr.id).toBe(10);
    expect(addr.firstName).toBe("Jane");
    expect(addr.company).toBe("Acme");
    expect(addr.street1).toBe("123 Main");
    expect(addr.street2).toBe("Apt 4");
    expect(addr.city).toBe("Phoenix");
    expect(addr.state).toBe("AZ");
    expect(addr.zip).toBe("85001");
  });
});

describe("parseSignature", () => {
  it("parses signature data", () => {
    const s = parseSignature({ id: 7, preview: "https://x.com/sig.png" });
    expect(s.id).toBe(7);
    expect(s.preview).toBe("https://x.com/sig.png");
  });

  it("defaults", () => {
    const s = parseSignature({});
    expect(s.id).toBe(0);
    expect(s.preview).toBeUndefined();
  });
});

describe("parseCountry", () => {
  it("parses country data", () => {
    const c = parseCountry({ code: "US", name: "United States" });
    expect(c.code).toBe("US");
    expect(c.name).toBe("United States");
  });
});

describe("parseState", () => {
  it("parses state data", () => {
    const s = parseState({ code: "AZ", name: "Arizona" });
    expect(s.code).toBe("AZ");
    expect(s.name).toBe("Arizona");
  });

  it("falls back to abbreviation", () => {
    expect(parseState({ abbreviation: "CA", name: "California" }).code).toBe("CA");
  });
});

describe("parseStampOption", () => {
  it("parses stamp option data", () => {
    const s = parseStampOption({
      id: 1,
      name: "First Class",
      description: "Standard first-class postage",
      price: 0.73,
    });
    expect(s.id).toBe(1);
    expect(s.name).toBe("First Class");
    expect(s.description).toBe("Standard first-class postage");
    expect(s.price).toBe(0.73);
  });

  it("falls back to title for name", () => {
    expect(parseStampOption({ id: 2, title: "Presorted" }).name).toBe("Presorted");
  });

  it("defaults", () => {
    const s = parseStampOption({});
    expect(s.id).toBe(0);
    expect(s.name).toBeUndefined();
    expect(s.price).toBeUndefined();
  });
});

describe("constants", () => {
  it("ZoneType values", () => {
    expect(ZoneType.TEXT).toBe("text");
    expect(ZoneType.LOGO).toBe("logo");
    expect(ZoneType.COVER).toBe("cover");
  });

  it("QRCodeLocation values", () => {
    expect(QRCodeLocation.HEADER).toBe("header");
    expect(QRCodeLocation.FOOTER).toBe("footer");
    expect(QRCodeLocation.MAIN).toBe("main");
  });

  it("DeliveryConfirmation values", () => {
    expect(DeliveryConfirmation.NONE).toBe(0);
    expect(DeliveryConfirmation.DELIVERY_CONFIRMATION).toBe(1);
    expect(DeliveryConfirmation.CASS_VALIDATION).toBe(2);
  });
});
