/**
 * Main Handwrytten client — the single entry point for all API interactions.
 *
 * @example
 * ```ts
 * import { Handwrytten } from "handwrytten";
 *
 * const client = new Handwrytten("your_api_key");
 *
 * // Check your account
 * const user = await client.auth.getUser();
 * console.log(`Logged in as ${user.email}`);
 *
 * // Browse available cards and fonts
 * const cards = await client.cards.list();
 * const fonts = await client.fonts.list();
 *
 * // Send a handwritten note
 * const result = await client.orders.send({
 *   cardId: cards[0].id,
 *   font: fonts[0].label,
 *   message: "Thanks for being an amazing customer!",
 *   recipient: {
 *     firstName: "Jane",
 *     lastName: "Doe",
 *     street1: "123 Main Street",
 *     city: "Phoenix",
 *     state: "AZ",
 *     zip: "85001",
 *   },
 * });
 * ```
 */

import { HttpClient, DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from "./http-client.js";
import {
  AddressBookResource,
  AuthResource,
  BasketResource,
  CardsResource,
  CustomCardsResource,
  FontsResource,
  GiftCardsResource,
  InsertsResource,
  OrdersResource,
  ProspectingResource,
  QRCodesResource,
} from "./resources/index.js";

export interface HandwryttenOptions {
  /** Your Handwrytten API key. */
  apiKey: string;
  /** Override the API base URL (default: production). */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30 000). */
  timeout?: number;
  /** Number of automatic retries for transient errors (default: 3). */
  maxRetries?: number;
  /** Custom `fetch` implementation (defaults to global `fetch`). */
  fetch?: typeof globalThis.fetch;
}

export class Handwrytten {
  private readonly _http: HttpClient;

  readonly auth: AuthResource;
  readonly cards: CardsResource;
  readonly customCards: CustomCardsResource;
  readonly fonts: FontsResource;
  readonly giftCards: GiftCardsResource;
  readonly inserts: InsertsResource;
  readonly qrCodes: QRCodesResource;
  readonly addressBook: AddressBookResource;
  readonly basket: BasketResource;
  readonly orders: OrdersResource;
  readonly prospecting: ProspectingResource;

  constructor(apiKeyOrOptions: string | HandwryttenOptions) {
    const options: HandwryttenOptions =
      typeof apiKeyOrOptions === "string"
        ? { apiKey: apiKeyOrOptions }
        : apiKeyOrOptions;

    if (!options.apiKey) {
      throw new Error(
        "An API key is required. Get one at https://app.handwrytten.com/api-keys",
      );
    }

    this._http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: options.maxRetries ?? 3,
      fetch: options.fetch,
    });

    // Resource namespaces
    this.auth = new AuthResource(this._http);
    this.cards = new CardsResource(this._http);
    this.customCards = new CustomCardsResource(this._http);
    this.fonts = new FontsResource(this._http);
    this.giftCards = new GiftCardsResource(this._http);
    this.inserts = new InsertsResource(this._http);
    this.qrCodes = new QRCodesResource(this._http);
    this.addressBook = new AddressBookResource(this._http);
    this.basket = new BasketResource(this._http);
    this.orders = new OrdersResource(this._http, this.basket);
    this.prospecting = new ProspectingResource(this._http);
  }
}
