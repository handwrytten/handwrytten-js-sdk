/** Create and manage handwritten note orders. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Order, Recipient, Sender } from "../models.js";
import { parseOrder } from "../models.js";
import type { BasketResource, SendBasketOptions } from "./basket.js";
import { flattenAddress } from "./helpers.js";

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------

/** A recipient can be a Recipient object, a plain address dict, or a saved address ID. */
export type RecipientInput = Recipient | ApiRecord | number;

/** A sender can be a Sender object, a plain address dict, or a saved address ID. */
export type SenderInput = Sender | ApiRecord | number;

export interface SendOrderOptions {
  cardId: string;
  font: string;
  /** One or more recipients — Recipient objects, address dicts, or saved address IDs. */
  recipient: RecipientInput | RecipientInput[];
  message?: string;
  wishes?: string;
  /** Default return address — Sender object, address dict, or saved address ID. */
  sender?: SenderInput;
  returnAddressId?: number;
  messageAlign?: string;
  denominationId?: number;
  insertId?: number;
  creditCardId?: number;
  couponCode?: string;
  dateSend?: string;
  checkCassBeforeSubmit?: boolean;
  deliveryConfirmation?: boolean;
  clientMetadata?: string;
  suppressWarnings?: boolean;
  signatureId?: number;
  signature2Id?: number;
  fontSize?: number;
  autoFontSize?: boolean;
  /** Additional parameters passed to `placeBasket`. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class OrdersResource {
  constructor(
    private readonly http: HttpClient,
    private readonly basket: BasketResource,
  ) {}

  /**
   * Send a handwritten note — adds to basket then sends in one call.
   *
   * Uses `orders/placeBasket` + `basket/send` under the hood.
   *
   * The `recipient` can be:
   * - A `Recipient` object
   * - A plain object with camelCase keys (`firstName`, `street1`, etc.)
   * - A plain object already in `to_*` format
   * - A saved address ID (number)
   * - An **array** of any of the above for bulk orders
   *
   * Each recipient object may include `message`, `wishes`, and `sender` keys
   * for per-recipient overrides.
   */
  async send(options: SendOrderOptions): Promise<ApiRecord> {
    const {
      cardId,
      font,
      recipient,
      message,
      wishes,
      sender,
      returnAddressId,
      messageAlign,
      denominationId,
      insertId,
      creditCardId,
      couponCode,
      dateSend,
      checkCassBeforeSubmit,
      deliveryConfirmation,
      clientMetadata,
      suppressWarnings,
      signatureId,
      signature2Id,
      fontSize,
      autoFontSize,
      ...extra
    } = options;

    // -- Resolve sender ---------------------------------------------------
    let senderId: number | undefined = returnAddressId;
    let defaultSenderFields: Record<string, string> | undefined;

    if (sender != null) {
      if (typeof sender === "number") {
        senderId = sender;
      } else {
        defaultSenderFields = flattenAddress(sender as ApiRecord, "from");
      }
    }

    // -- Resolve recipients -----------------------------------------------
    const recipients = Array.isArray(recipient) ? recipient : [recipient];
    const addresses: ApiRecord[] = [];

    for (const r of recipients) {
      let row: ApiRecord = {};

      if (typeof r === "number") {
        row.address_id = r;
      } else {
        const rObj = { ...(r as ApiRecord) };
        const rowMessage = rObj.message;
        const rowWishes = rObj.wishes;
        const rowSender = rObj.sender;
        delete rObj.message;
        delete rObj.wishes;
        delete rObj.sender;

        if (!Object.keys(rObj).some((k) => k.startsWith("to_"))) {
          row = flattenAddress(rObj, "to") as ApiRecord;
        } else {
          row = rObj;
        }

        if (rowMessage != null) row.message = rowMessage;
        if (rowWishes != null) row.wishes = rowWishes;

        // Per-recipient sender override
        if (rowSender != null) {
          if (typeof rowSender === "number") {
            row.return_address_id = rowSender;
          } else {
            Object.assign(row, flattenAddress(rowSender as ApiRecord, "from"));
          }
        }
      }

      // Apply defaults for message/wishes
      if (!("message" in row) && message != null) row.message = message;
      if (!("wishes" in row) && wishes != null) row.wishes = wishes;

      // Apply default sender from_* fields
      if (
        defaultSenderFields &&
        !Object.keys(row).some((k) => k.startsWith("from_")) &&
        !("return_address_id" in row)
      ) {
        Object.assign(row, defaultSenderFields);
      }

      addresses.push(row);
    }

    // Build placeBasket args
    const placeOptions: ApiRecord = {
      cardId,
      font,
      addresses,
    };

    if (senderId != null) placeOptions.returnAddressId = senderId;
    if (messageAlign != null) placeOptions.messageAlign = messageAlign;
    if (denominationId != null) placeOptions.denominationId = denominationId;
    if (insertId != null) placeOptions.insertId = insertId;
    if (dateSend != null) placeOptions.dateSend = dateSend;
    if (deliveryConfirmation != null) placeOptions.deliveryConfirmation = deliveryConfirmation;
    if (clientMetadata != null) placeOptions.clientMetadata = clientMetadata;
    if (suppressWarnings != null) placeOptions.suppressWarnings = suppressWarnings;
    if (signatureId != null) placeOptions.signatureId = signatureId;
    if (signature2Id != null) placeOptions.signature2Id = signature2Id;
    if (fontSize != null) placeOptions.fontSize = fontSize;
    if (autoFontSize != null) placeOptions.autoFontSize = autoFontSize;
    if (couponCode != null) placeOptions.couponCode = couponCode;

    Object.assign(placeOptions, extra);

    // Step 1: placeBasket
    await this.basket.addOrder(placeOptions as any);

    // Step 2: basket/send
    const sendOptions: SendBasketOptions = {};
    if (creditCardId != null) sendOptions.creditCardId = creditCardId;
    if (couponCode != null) sendOptions.couponCode = couponCode;
    if (checkCassBeforeSubmit != null) sendOptions.checkCassBeforeSubmit = checkCassBeforeSubmit;

    return this.basket.send(sendOptions);
  }

  /** Retrieve an order by ID. */
  async get(orderId: string): Promise<Order> {
    const data = await this.http.get(`orders/get/${orderId}`);
    return parseOrder(isRecord(data) ? data : {});
  }

  /** List orders with pagination. */
  async list(options?: { page?: number; perPage?: number }): Promise<Order[]> {
    const data = await this.http.get("orders/list", {
      page: options?.page ?? 1,
      per_page: options?.perPage ?? 50,
    });

    let items: ApiRecord[];
    if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else if (isRecord(data)) {
      items = ((data.results ?? data.orders ?? []) as ApiRecord[]);
    } else {
      items = [];
    }
    return items.map(parseOrder);
  }

  /** List previously submitted baskets. */
  async listPastBaskets(options?: { page?: number }): Promise<ApiRecord[]> {
    const data = await this.http.get("orders/pastBaskets", {
      page: options?.page ?? 1,
    });
    if (isRecord(data)) {
      return (data.baskets ?? data.results ?? []) as ApiRecord[];
    }
    return Array.isArray(data) ? (data as ApiRecord[]) : [];
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
