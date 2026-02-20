/**
 * Quick test script for the Handwrytten SDK.
 *
 * Run with:
 *   npx tsx examples/example.ts
 *
 * Set your API key via the HANDWRYTTEN_API_KEY environment variable:
 *   HANDWRYTTEN_API_KEY=your_key npx tsx examples/example.ts
 */

import { Handwrytten, HandwryttenError, QRCodeLocation, ZoneType } from "handwrytten";

const API_KEY = process.env.HANDWRYTTEN_API_KEY ?? "<your_api_key_here>";

async function main() {
  const client = new Handwrytten(API_KEY);
  console.log("Client initialized\n");

  // 1. Get current user
  console.log("--- User Info ---");
  const user = await client.auth.getUser();
  console.log(`  Email: ${user.email}`);
  console.log();

  // 2. List available cards
  console.log("--- Cards (first 5) ---");
  const cards = await client.cards.list();
  for (const card of cards.slice(0, 5)) {
    console.log(`  [${card.id}] ${card.title}`);
  }
  console.log(`  ... ${cards.length} total cards`);
  console.log();

  // 3. List available handwriting fonts
  console.log("--- Handwriting Fonts (first 5) ---");
  const fonts = await client.fonts.list();
  for (const font of fonts.slice(0, 5)) {
    console.log(`  [${font.id}] ${font.label}`);
  }
  console.log(`  ... ${fonts.length} total fonts`);
  console.log();

  // 4. List customizer fonts (for custom card text zones)
  console.log("--- Customizer Fonts (first 5) ---");
  const customizerFonts = await client.fonts.listForCustomizer();
  for (const f of customizerFonts.slice(0, 5)) {
    console.log(`  [${f.id}] ${f.label}`);
  }
  console.log(`  ... ${customizerFonts.length} total customizer fonts`);
  console.log();

  // 5. List gift cards with denominations
  console.log("--- Gift Cards ---");
  const giftCards = await client.giftCards.list();
  for (const gc of giftCards.slice(0, 5)) {
    console.log(`  [${gc.id}] ${gc.title} (${gc.denominations.length} denominations)`);
    for (const d of gc.denominations.slice(0, 3)) {
      console.log(`       $${d.nominal} (price: $${d.price})`);
    }
  }
  console.log(`  ... ${giftCards.length} total gift cards`);
  console.log();

  // 5b. List inserts (including historical)
  console.log("--- Inserts ---");
  const inserts = await client.inserts.list();
  console.log(`  Active inserts: ${inserts.length}`);
  const allInserts = await client.inserts.list({ includeHistorical: true });
  console.log(`  All inserts (incl. historical): ${allInserts.length}`);
  console.log();

  // 5c. List signatures
  console.log("--- Signatures ---");
  const signatures = await client.auth.listSignatures();
  for (const sig of signatures.slice(0, 5)) {
    console.log(`  [${sig.id}] preview=${sig.preview ?? "N/A"}`);
  }
  console.log(`  ... ${signatures.length} total signatures`);
  console.log();

  // 6. List orders
  console.log("--- Recent Orders ---");
  const orders = await client.orders.list({ page: 1, perPage: 5 });
  if (orders.length > 0) {
    for (const order of orders.slice(0, 5)) {
      console.log(`  [${order.id}] status=${order.status}`);
    }
  } else {
    console.log("  No orders found.");
  }
  console.log();

  // 7. Send a single order with sender
  console.log("--- Send Single Order ---");
  console.log(`  Using cardId=${cards[0].id}, font=${fonts[0].id}`);
  await client.orders.send({
    cardId: cards[0].id,
    font: fonts[0].id,
    message: "Thanks for being an amazing customer!",
    wishes: "Best,\nThe Handwrytten Team",
    sender: {
      firstName: "David",
      lastName: "Wachs",
      street1: "3433 E Main Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85018",
    },
    recipient: {
      firstName: "Jane",
      lastName: "Doe",
      street1: "3433 E Main Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
    },
  });
  console.log("  Order sent!");
  console.log();

  // 7b. Send an order with a gift card denomination and an insert
  if (giftCards.length > 0 && giftCards[0].denominations.length > 0 && inserts.length > 0) {
    console.log("--- Send Order with Gift Card & Insert ---");
    await client.orders.send({
      cardId: cards[0].id,
      font: fonts[0].id,
      message: "Enjoy this gift!",
      denominationId: giftCards[0].denominations[0].id,
      insertId: Number(inserts[0].id),
      sender: {
        firstName: "David",
        lastName: "Wachs",
        street1: "3433 E Main Ave",
        city: "Phoenix",
        state: "AZ",
        zip: "85018",
      },
      recipient: {
        firstName: "Jane",
        lastName: "Doe",
        street1: "3433 E Main Ave",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
      },
    });
    console.log("  Order with gift card & insert sent!");
    console.log();
  }

  // 8. Send bulk — multiple recipients with per-recipient messages
  console.log("--- Send Bulk Order ---");
  await client.orders.send({
    cardId: cards[0].id,
    font: fonts[0].id,
    sender: {
      firstName: "David",
      lastName: "Wachs",
      street1: "3433 E Main Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85018",
    },
    recipient: [
      {
        firstName: "Jane",
        lastName: "Doe",
        street1: "3433 E Main Ave",
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
        wishes: "Cheers,\nThe Team",
      },
    ],
  });
  console.log("  Bulk order sent!");
  console.log();

  // 9. Address Book — save and list addresses
  console.log("--- Address Book ---");

  // Save a sender (return address)
  const senderId = await client.addressBook.addSender({
    firstName: "David",
    lastName: "Wachs",
    street1: "3433 E Main Ave",
    city: "Phoenix",
    state: "AZ",
    zip: "85018",
  });
  console.log(`  Saved sender address: id=${senderId}`);

  // Save a recipient
  const recipientId = await client.addressBook.addRecipient({
    firstName: "Jane",
    lastName: "Doe",
    street1: "3433 E Main Ave",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
  });
  console.log(`  Saved recipient address: id=${recipientId}`);

  // List saved senders
  const senders = await client.addressBook.listSenders();
  console.log(`  Saved senders: ${senders.length}`);
  for (const s of senders.slice(0, 3)) {
    console.log(`    [${s.id}] ${s.firstName} ${s.lastName}, ${s.street1}`);
  }

  // List saved recipients
  const recipients = await client.addressBook.listRecipients();
  console.log(`  Saved recipients: ${recipients.length}`);
  for (const r of recipients.slice(0, 3)) {
    console.log(`    [${r.id}] ${r.firstName} ${r.lastName}, ${r.street1}`);
  }

  // Send an order using saved address IDs
  console.log("  Sending order with saved address IDs...");
  await client.orders.send({
    cardId: cards[0].id,
    font: fonts[0].id,
    message: "Hello from saved addresses!",
    sender: senderId,
    recipient: recipientId,
  });
  console.log("  Order with saved addresses sent!");
  console.log();

  // 10. Two-step basket workflow
  console.log("--- Two-Step Basket Order ---");

  // Inspect the basket before adding anything
  console.log(`  Items in basket: ${await client.basket.count()}`);

  // Step 1: Add order(s) to the basket
  const placeResult = await client.basket.addOrder({
    cardId: cards[0].id,
    font: fonts[0].id,
    returnAddressId: senderId,
    addresses: [
      {
        firstName: "Jane",
        lastName: "Doe",
        street1: "3433 E Main Ave",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        message: "Hello from the basket workflow!",
        wishes: "Best,\nThe Team",
      },
    ],
  });
  console.log(`  Order added to basket. order_id=${placeResult.order_id}`);

  // List all items currently in the basket
  const basket = await client.basket.list();
  console.log(
    `  Basket now has ${await client.basket.count()} item(s), grand total: ${(basket as any)?.totals?.grand_total}`,
  );
  const items = ((basket as any)?.items ?? []) as any[];
  for (const item of items) {
    console.log(
      `    basket_id=${item.basket_id} status=${item.status} price=${item.price}`,
    );
  }

  // Fetch a single basket item by basket_id
  if (items.length > 0) {
    const basketId = items[0].basket_id;
    const itemDetail = await client.basket.getItem(basketId);
    console.log(
      `  Item detail: basket_id=${basketId} font=${(itemDetail as any)?.item?.font}`,
    );

    // Remove that item from the basket
    await client.basket.remove(basketId);
    console.log(
      `  Removed basket_id=${basketId}. Items remaining: ${await client.basket.count()}`,
    );
  }

  // Add a fresh order and submit it
  await client.basket.addOrder({
    cardId: cards[0].id,
    font: fonts[0].id,
    returnAddressId: senderId,
    addresses: [
      {
        firstName: "Jane",
        lastName: "Doe",
        street1: "3433 E Main Ave",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        message: "Hello from the basket workflow!",
        wishes: "Best,\nThe Team",
      },
    ],
  });

  // Step 2: Submit the basket
  const result = await client.basket.send();
  console.log(`  Basket sent! ${JSON.stringify(result)}`);

  // Clear any leftover items
  await client.basket.clear();
  console.log(`  Basket cleared. Items remaining: ${await client.basket.count()}`);
  console.log();

  // 11. Custom cards — upload images and create a card
  console.log("--- Custom Cards ---");

  // Get available card dimensions (filter for flat landscape)
  const allDims = await client.customCards.dimensions();
  console.log(`  All dimensions: ${allDims.length}`);
  for (const d of allDims) {
    console.log(`    [${d.id}] ${d.openWidth}x${d.openHeight} ${d.format} (${d.orientation})`);
  }

  const flatDims = await client.customCards.dimensions({ format: "flat" });
  console.log(`  Flat dimensions: ${flatDims.length}`);

  // List existing uploaded images
  const images = await client.customCards.listImages();
  console.log(`  Existing custom images: ${images.length}`);
  for (const img of images.slice(0, 3)) {
    console.log(`    [${img.id}] type=${img.imageType} url=${img.imageUrl ?? ""}`);
  }

  // Upload a cover image by URL
  console.log("  Uploading cover image...");
  const cover = await client.customCards.uploadImage({
    url: "https://cdn.handwrytten.com/www/2026/01/5-Strategic-Ways-hero-scaled.jpg",
    imageType: "cover",
  });
  console.log(`    Cover uploaded: id=${cover.id}, url=${cover.imageUrl}`);

  // Upload a logo image by URL
  console.log("  Uploading logo image...");
  const logo = await client.customCards.uploadImage({
    url: "https://webcdn.handwrytten.com/wp-content/themes/handwrytten/images/logo@2x.png",
    imageType: "logo",
  });
  console.log(`    Logo uploaded: id=${logo.id}, url=${logo.imageUrl}`);

  // Create a QR code
  console.log("  Creating QR code...");
  // QR codes must have unique names, so we generate a random number
  const qr = await client.qrCodes.create({
    name: `SDK Test QR ${Math.floor(Math.random() * 900000 + 100000)}`,
    url: "https://www.handwrytten.com",
  });
  console.log(`    QR code created: id=${qr.id}`);

  // List QR code frames
  const frames = await client.qrCodes.frames();
  console.log(`  Available QR code frames: ${frames.length}`);
  for (const f of frames) {
    console.log(`    [${f.id}] type=${f.type} url=${f.url}`);
  }

  // Create a custom card with a QR code
  console.log("  Creating custom card with QR code...");
  const customCard = await client.customCards.create({
    name: "SDK Test Card",
    dimensionId: String(allDims[0].id),
    coverId: cover.id,
    headerType: ZoneType.LOGO,
    headerLogoId: logo.id,
    headerLogoSizePercent: 80,
    qrCodeId: Number(qr.id),
    qrCodeLocation: QRCodeLocation.FOOTER,
    qrCodeSizePercent: 100,
  });
  console.log(`    Custom card created: cardId=${customCard.cardId}`);

  // Get details of the custom card we just created
  const cardDetail = await client.customCards.get(customCard.cardId);
  console.log(`    Custom card detail: cardId=${cardDetail.cardId}`);
  console.log();

  // 12. Send an order using the custom card
  console.log("--- Send Order with Custom Card ---");
  await client.orders.send({
    cardId: String(customCard.cardId),
    font: fonts[0].id,
    message: "Hello from our custom card!",
    recipient: {
      firstName: "Jane",
      lastName: "Doe",
      street1: "3433 E Main Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85001",
    },
  });
  console.log("  Custom card order sent!");
  console.log();

  // 13. List past baskets
  console.log("--- Past Baskets ---");
  const pastBaskets = await client.orders.listPastBaskets({ page: 1 });
  console.log(`  Past baskets: ${pastBaskets.length}`);
  for (const pb of pastBaskets.slice(0, 3)) {
    console.log(`    ${JSON.stringify(pb)}`);
  }
  console.log();

  // 14. Delete saved addresses
  console.log("--- Delete Saved Addresses ---");
  await client.addressBook.deleteRecipient({ addressId: recipientId });
  console.log(`  Deleted recipient address: id=${recipientId}`);
  await client.addressBook.deleteSender({ addressId: senderId });
  console.log(`  Deleted sender address: id=${senderId}`);
  console.log();

  // Clean up: delete the custom card and images
  // console.log("--- Cleanup ---");
  // await client.customCards.delete(customCard.cardId);
  // console.log(`  Deleted custom card ${customCard.cardId}`);
  // await client.customCards.deleteImage(cover.id);
  // console.log(`  Deleted cover image ${cover.id}`);
  // await client.customCards.deleteImage(logo.id);
  // console.log(`  Deleted logo image ${logo.id}`);
  // await client.qrCodes.delete(Number(qr.id));
  // console.log(`  Deleted QR code ${qr.id}`);

  console.log("\nAll done!");
}

main().catch((err) => {
  if (err instanceof HandwryttenError) {
    console.error(`\nAPI error: ${err}`);
    if (err.responseBody) {
      console.error(`Full response body: ${JSON.stringify(err.responseBody)}`);
    }
  } else {
    throw err;
  }
});
