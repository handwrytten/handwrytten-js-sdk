/**
 * Handwrytten TypeScript SDK
 *
 * Official TypeScript SDK for the Handwrytten API — send real handwritten
 * notes at scale using robots with real pens.
 *
 * @example
 * ```ts
 * import { Handwrytten } from "handwrytten";
 *
 * const client = new Handwrytten("your_api_key");
 * const cards = await client.cards.list();
 * const fonts = await client.fonts.list();
 *
 * await client.orders.send({
 *   cardId: cards[0].id,
 *   font: fonts[0].id,
 *   message: "Thanks for your business!",
 *   recipient: { firstName: "Jane", lastName: "Doe", ... },
 * });
 * ```
 *
 * @packageDocumentation
 */

export { Handwrytten } from "./client.js";
export type { HandwryttenOptions } from "./client.js";

// Errors
export {
  HandwryttenError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";

// Models
export type {
  ApiRecord,
  Card,
  Country,
  CustomCard,
  CustomImage,
  Dimension,
  Font,
  GiftCard,
  Insert,
  Order,
  QRCode,
  Recipient,
  SavedAddress,
  Sender,
  State,
  User,
} from "./models.js";
export { QRCodeLocation, ZoneType } from "./models.js";

// Parsers (for advanced usage)
export {
  parseCard,
  parseCountry,
  parseCustomCard,
  parseCustomImage,
  parseDimension,
  parseFont,
  parseGiftCard,
  parseInsert,
  parseOrder,
  parseQRCode,
  parseSavedAddress,
  parseState,
  parseUser,
} from "./models.js";

// Resource classes (for advanced typing)
export type {
  AddOrderOptions,
  AddRecipientOptions,
  AddSenderOptions,
  CalculateTargetsOptions,
  CreateCustomCardOptions,
  CreateQRCodeOptions,
  RecipientInput,
  SendBasketOptions,
  SendOrderOptions,
  SenderInput,
  UpdateRecipientOptions,
  UploadImageOptions,
} from "./resources/index.js";

// HTTP client (for advanced usage)
export { HttpClient, DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "./http-client.js";
export type { HttpClientOptions } from "./http-client.js";
