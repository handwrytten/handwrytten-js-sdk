# Handwrytten TypeScript SDK

The official TypeScript SDK for the [Handwrytten API](https://www.handwrytten.com/api/) — send real handwritten notes at scale using robots with real pens.

## Installation

```bash
npm install handwrytten
```

## Quick Start

```typescript
import { Handwrytten } from "handwrytten";

const client = new Handwrytten("your_api_key");

// Browse available cards and fonts
const cards = await client.cards.list();
const fonts = await client.fonts.list();

// Send a handwritten note in one call
const result = await client.orders.send({
  cardId: cards[0].id,
  font: fonts[0].id,
  message: "Thanks for being an amazing customer!",
  wishes: "Best,\nThe Handwrytten Team",
  sender: {
    firstName: "David",
    lastName: "Wachs",
    street1: "100 S Mill Ave",
    city: "Tempe",
    state: "AZ",
    zip: "85281",
  },
  recipient: {
    firstName: "Jane",
    lastName: "Doe",
    street1: "123 Main Street",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
  },
});
```

## Usage

### Send a Single Note

```typescript
const result = await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  message: "Thank you for your business!",
  wishes: "Best,\nThe Team",
  sender: {
    firstName: "David",
    lastName: "Wachs",
    street1: "100 S Mill Ave",
    city: "Tempe",
    state: "AZ",
    zip: "85281",
  },
  recipient: {
    firstName: "Jane",
    lastName: "Doe",
    street1: "123 Main St",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
  },
});
```

### Send Bulk — Multiple Recipients with Per-Recipient Overrides

Each recipient can have its own `message`, `wishes`, and `sender`. Top-level values serve as defaults for any recipient that doesn't specify its own.

```typescript
const result = await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  sender: {
    firstName: "David",
    lastName: "Wachs",
    street1: "100 S Mill Ave",
    city: "Tempe",
    state: "AZ",
    zip: "85281",
  },
  recipient: [
    {
      firstName: "Jane",
      lastName: "Doe",
      street1: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      message: "Thanks for your loyalty, Jane!",
      wishes: "Warmly,\nThe Team",
    },
    {
      firstName: "John",
      lastName: "Smith",
      street1: "456 Oak Ave",
      city: "Tempe",
      state: "AZ",
      zip: "85281",
      message: "Great working with you, John!",
      sender: {
        firstName: "Other",
        lastName: "Person",
        street1: "789 Elm St",
        city: "Mesa",
        state: "AZ",
        zip: "85201",
      },
    },
  ],
});
```

### Use Saved Address IDs

If you have addresses saved in your Handwrytten account, pass their IDs directly:

```typescript
const result = await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  message: "Thank you!",
  sender: 98765,    // saved return-address ID
  recipient: 67890, // saved recipient address ID
});

// Mix saved IDs and inline addresses in a bulk send
const result2 = await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  message: "Hello!",
  sender: 98765,
  recipient: [
    67890, // saved address ID
    {
      firstName: "Jane",
      lastName: "Doe",
      street1: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
    },
  ],
});
```

### Use Typed Models

```typescript
import { Handwrytten, Recipient, Sender } from "handwrytten";

const sender: Sender = {
  firstName: "David",
  lastName: "Wachs",
  street1: "100 S Mill Ave",
  city: "Tempe",
  state: "AZ",
  zip: "85281",
};

const recipient: Recipient = {
  firstName: "Jane",
  lastName: "Doe",
  street1: "123 Main Street",
  city: "Phoenix",
  state: "AZ",
  zip: "85001",
};

const result = await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  message: "Welcome aboard!",
  sender,
  recipient,
});
```

### Custom Cards

Create custom cards with your own cover images and logos.

```typescript
import { ZoneType, QRCodeLocation } from "handwrytten";

// 1. Get available card dimensions
const dims = await client.customCards.dimensions();
for (const d of dims) {
  console.log(d.id, `${d.openWidth}x${d.openHeight} ${d.format} (${d.orientation})`);
}

// Filter by format and/or orientation
const flatDims = await client.customCards.dimensions({ format: "flat" });

// 2. Upload a full-bleed cover image (front of card)
const cover = await client.customCards.uploadImage({
  url: "https://example.com/cover.jpg",
  imageType: "cover",
});

// 3. Upload a logo (appears on the writing side)
const logo = await client.customCards.uploadImage({
  url: "https://example.com/logo.png",
  imageType: "logo",
});

// 4. Check image quality (optional)
const check = await client.customCards.checkImage(logo.id);

// 5. Create the custom card
const card = await client.customCards.create({
  name: "My Custom Card",
  dimensionId: String(dims[0].id),
  coverId: cover.id,
  headerLogoId: logo.id,
  headerLogoSizePercent: 80,
});

// 6. Use the new card to send orders
await client.orders.send({
  cardId: String(card.cardId),
  font: "hwDavid",
  message: "Hello from our custom card!",
  recipient: { /* ... */ },
});
```

Custom cards support text and logos in multiple zones:

| Zone | Logo field | Text field | Font field |
|---|---|---|---|
| Header (top of writing side) | `headerLogoId` | `headerText` | `headerFontId` |
| Main (center, folded cards) | `mainLogoId` | `mainText` | `mainFontId` |
| Footer (bottom of writing side) | `footerLogoId` | `footerText` | `footerFontId` |
| Back | `backLogoId` | `backText` | `backFontId` |
| Front cover | `coverId` | — | — |
| Back cover | `backCoverId` | — | — |

Font IDs for text zones come from `client.fonts.listForCustomizer()` (printed/typeset fonts), which are different from the handwriting fonts used in `client.fonts.list()`.

### Manage Custom Images

```typescript
// List all uploaded images
const images = await client.customCards.listImages();
for (const img of images) {
  console.log(img.id, img.imageType, img.imageUrl);
}

// Filter by type
const covers = await client.customCards.listImages("cover");
const logos = await client.customCards.listImages("logo");

// Delete an image
await client.customCards.deleteImage(123);

// Delete a custom card
await client.customCards.delete(456);
```

### Browse Cards and Fonts

```typescript
// Card templates
const cards = await client.cards.list();
const card = await client.cards.get("12345");
const categories = await client.cards.categories();

// Handwriting fonts (for orders)
const fonts = await client.fonts.list();
for (const font of fonts) {
  console.log(`${font.id}: ${font.label}`);
}

// Customizer fonts (for custom card text zones)
const customizerFonts = await client.fonts.listForCustomizer();
```

### Gift Cards and Inserts

```typescript
const giftCards = await client.giftCards.list();
const inserts = await client.inserts.list();
```

### QR Codes

Create QR codes and attach them to custom cards.

```typescript
import { QRCodeLocation } from "handwrytten";

// Create a QR code
const qr = await client.qrCodes.create({ name: "Website Link", url: "https://example.com" });

// List existing QR codes
const qrCodes = await client.qrCodes.list();

// Browse available frames (decorative borders around the QR code)
const frames = await client.qrCodes.frames();

// Attach a QR code to a custom card
const card = await client.customCards.create({
  name: "Card with QR",
  dimensionId: String(dims[0].id),
  coverId: cover.id,
  qrCodeId: Number(qr.id),
  qrCodeLocation: QRCodeLocation.FOOTER, // HEADER, FOOTER, or MAIN
  qrCodeSizePercent: 30,
  qrCodeAlign: "right",
});

// Delete a QR code
await client.qrCodes.delete(Number(qr.id));
```

### Address Book

Save and manage recipient and sender addresses, then use their IDs when sending orders.

```typescript
// Save a sender (return address)
const senderId = await client.addressBook.addSender({
  firstName: "David",
  lastName: "Wachs",
  street1: "100 S Mill Ave",
  city: "Tempe",
  state: "AZ",
  zip: "85281",
});

// Save a recipient
const recipientId = await client.addressBook.addRecipient({
  firstName: "Jane",
  lastName: "Doe",
  street1: "123 Main St",
  city: "Phoenix",
  state: "AZ",
  zip: "85001",
});

// Send using saved IDs
await client.orders.send({
  cardId: "12345",
  font: "hwDavid",
  message: "Hello!",
  sender: senderId,
  recipient: recipientId,
});

// Update a recipient
await client.addressBook.updateRecipient({
  addressId: recipientId,
  street1: "456 New St",
  city: "Scottsdale",
});

// List saved addresses
const senders = await client.addressBook.listSenders();
const recipients = await client.addressBook.listRecipients();

// Countries and states
const countries = await client.addressBook.countries();
const states = await client.addressBook.states("US");
```

### Two-Step Basket Workflow

For finer control, use `client.basket` directly instead of `client.orders.send()`:

```typescript
// Step 1: Add order(s) to the basket
await client.basket.addOrder({
  cardId: "12345",
  font: "hwDavid",
  addresses: [
    {
      firstName: "Jane",
      lastName: "Doe",
      street1: "123 Main St",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
      message: "Hello!",
    },
  ],
});

// Step 2: Submit the basket
const result = await client.basket.send();

// Inspect the basket before sending
const basket = await client.basket.list();   // all items with totals
const item = await client.basket.getItem(9517); // single item by basket_id
const n = await client.basket.count();       // number of items

// Remove a specific item or clear everything
await client.basket.remove(9517);
await client.basket.clear();
```

### Error Handling

```typescript
import {
  HandwryttenError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
} from "handwrytten";

try {
  const result = await client.orders.send({ /* ... */ });
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Check your API key");
  } else if (err instanceof BadRequestError) {
    console.error(`Invalid request: ${err.message}`);
    console.error(`Details: ${JSON.stringify(err.responseBody)}`);
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited — retry after ${err.retryAfter}s`);
  } else if (err instanceof HandwryttenError) {
    console.error(`API error: ${err}`);
  }
}
```

## API Resources

| Resource | Methods |
|---|---|
| `client.auth` | `getUser()`, `login()` |
| `client.cards` | `list()`, `get(id)`, `categories()` |
| `client.customCards` | `dimensions()`, `uploadImage()`, `checkImage()`, `listImages()`, `deleteImage()`, `create()`, `delete()` |
| `client.fonts` | `list()`, `listForCustomizer()` |
| `client.giftCards` | `list()` |
| `client.inserts` | `list()` |
| `client.qrCodes` | `list()`, `create()`, `delete()`, `frames()` |
| `client.addressBook` | `listRecipients()`, `addRecipient()`, `updateRecipient()`, `listSenders()`, `addSender()`, `countries()`, `states(country)` |
| `client.orders` | `send()`, `get(id)`, `list()` |
| `client.basket` | `addOrder()`, `send()`, `remove(basketId)`, `clear()`, `list()`, `getItem(basketId)`, `count()` |
| `client.prospecting` | `calculateTargets({ zipCode, radiusMiles })` |

## Configuration

```typescript
const client = new Handwrytten({
  apiKey: "your_key",
  timeout: 60_000,     // milliseconds (default: 30000)
  maxRetries: 5,       // automatic retries with exponential backoff
});
```

You can also inject a custom `fetch` implementation:

```typescript
const client = new Handwrytten({
  apiKey: "your_key",
  fetch: myCustomFetch,
});
```

## Full Example

See [`examples/example.ts`](examples/example.ts) for a complete working demo that exercises every resource: listing cards/fonts, sending single and bulk orders, uploading custom images, creating custom cards, and cleanup.

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5.0+ (for type definitions)

## License

MIT
