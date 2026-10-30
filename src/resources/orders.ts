/** Create and manage handwritten note orders. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, DeliveryConfirmation, Order, Recipient, Sender } from "../models.js";
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
  /**
   * Gift box ID from `client.bundles.list()`. US recipients only; cannot be
   * combined with `insertId` or `denominationId`.
   */
  bundleId?: number;
  creditCardId?: number;
  couponCode?: string;
  dateSend?: string;
  checkCassBeforeSubmit?: boolean;
  /**
   * Delivery confirmation mode. Accepts:
   * - `0` — none (default)
   * - `1` — USPS delivery confirmation
   * - `2` — CASS address validation only
   *
   * Booleans remain supported: false maps to 0, true maps to 1.
   * Use the {@link DeliveryConfirmation} constant for readability.
   */
  deliveryConfirmation?: DeliveryConfirmation | number | boolean;
  /**
   * Stamp option ID selecting first-class vs. presorted mail for US orders.
   * Fetch available options via `client.shipping.stampOptions()`.
   * Ignored for international orders.
   */
  stampOptionId?: number;
  clientMetadata?: string;
  suppressWarnings?: boolean;
  signatureId?: number;
  signature2Id?: number;
  fontSize?: number;
  autoFontSize?: boolean;
  /** Additional parameters passed to `placeBasket`. */
  [key: string]: unknown;
}

export interface SendSingleOrderOptions {
  cardId: string | number;
  /**
   * Handwriting font label, e.g. `"Casual David"` — the `label` from
   * `client.fonts.list()`, not its `id`.
   */
  fontLabel: string;
  message: string;
  /** One recipient — a Recipient object or address dict. Saved address IDs are not supported. */
  recipient: Recipient | ApiRecord;
  wishes?: string;
  /**
   * Return address — Sender object, address dict, or saved address ID.
   *
   * Required in practice: the API does not fall back to the account's default
   * return address and rejects the order without one. It can be omitted only
   * by team members whose team enforces a return address.
   */
  sender?: SenderInput;
  messageAlign?: string;
  denominationId?: number;
  insertId?: number;
  /**
   * Gift box ID from `client.bundles.list()`. US recipients only; cannot be
   * combined with `insertId` or `denominationId`.
   */
  bundleId?: number;
  creditCardId?: number;
  couponCode?: string;
  dateSend?: string;
  validateAddress?: boolean;
  checkCassBeforeSubmit?: boolean;
  /**
   * Delivery confirmation mode: `0` none (default), `1` USPS delivery
   * confirmation, `2` CASS address validation only. Booleans map to 0/1.
   */
  deliveryConfirmation?: DeliveryConfirmation | number | boolean;
  /** Stamp option ID from `client.shipping.stampOptions()`. Ignored for international orders. */
  stampOptionId?: number;
  webhookUrl?: string;
  clientMetadata?: string;
  suppressWarnings?: boolean;
  /** Additional parameters passed to `orders/singleStepOrder`. */
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
   * - An **array** of any of the above for bulk orders — must be either all
   *   saved-address IDs or all inline address objects, not a mix
   *
   * Each inline recipient object may include `message`, `wishes`, and
   * `sender` keys for per-recipient overrides. For saved-address IDs, the
   * top-level `message`/`wishes` apply to every recipient.
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
      bundleId,
      creditCardId,
      couponCode,
      dateSend,
      checkCassBeforeSubmit,
      deliveryConfirmation,
      stampOptionId,
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

    // Reject mixed arrays: either all saved-address IDs (numbers) or all
    // inline address objects. placeBasket's behavior on mixed input is
    // untested and has no real use case — callers should pick one form.
    const numericCount = recipients.filter((r) => typeof r === "number").length;
    if (numericCount > 0 && numericCount < recipients.length) {
      throw new Error(
        "recipient array must contain either all saved-address IDs (numbers) or all inline address objects — not a mix",
      );
    }

    const addresses: ApiRecord[] = [];
    const addressIds: number[] = [];

    for (const r of recipients) {
      if (typeof r === "number") {
        // Numeric IDs must go via the top-level addressIds param so the API
        // resolves the saved address. Embedding them inside `addresses` as
        // {address_id} is not recognised and causes blank addresses.
        addressIds.push(r);
      } else {
        if (r == null || typeof r !== "object" || Array.isArray(r)) {
          throw new TypeError("Each recipient must be an address object or saved-address ID");
        }
        let row: ApiRecord = {};
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
    }

    // Build placeBasket args
    const placeOptions: ApiRecord = {
      cardId,
      font,
    };
    if (addresses.length > 0) placeOptions.addresses = addresses;
    if (addressIds.length > 0) placeOptions.addressIds = addressIds;
    // placeBasket uses top-level message/wishes for address_ids rows, and
    // each dict row's own message/wishes for inline addresses. Forwarding
    // them unconditionally covers both cases.
    if (message != null) placeOptions.message = message;
    if (wishes != null) placeOptions.wishes = wishes;

    if (senderId != null) placeOptions.returnAddressId = senderId;
    if (messageAlign != null) placeOptions.messageAlign = messageAlign;
    if (denominationId != null) placeOptions.denominationId = denominationId;
    if (insertId != null) placeOptions.insertId = insertId;
    if (bundleId != null) placeOptions.bundleId = bundleId;
    if (dateSend != null) placeOptions.dateSend = dateSend;
    if (deliveryConfirmation != null) placeOptions.deliveryConfirmation = deliveryConfirmation;
    if (stampOptionId != null) placeOptions.stampOptionId = stampOptionId;
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

  /**
   * Create and pay for one order in a single call (`orders/singleStepOrder`).
   *
   * Unlike `send()`, this never touches the account's basket, so concurrent
   * calls each pay only for their own card. Returns the API response,
   * including `order_id`.
   *
   * A 5xx, timeout or network error is not retried, because the order may
   * already exist. Check `client.orders.list()` before sending again.
   */
  async sendSingle(options: SendSingleOrderOptions): Promise<ApiRecord> {
    const {
      cardId,
      fontLabel,
      message,
      recipient,
      wishes,
      sender,
      messageAlign,
      denominationId,
      insertId,
      bundleId,
      creditCardId,
      couponCode,
      dateSend,
      validateAddress,
      checkCassBeforeSubmit,
      deliveryConfirmation,
      stampOptionId,
      webhookUrl,
      clientMetadata,
      suppressWarnings,
      ...extra
    } = options;

    if (recipient == null || typeof recipient !== "object" || Array.isArray(recipient)) {
      throw new TypeError("recipient must be a single address object; saved address IDs and arrays are not supported");
    }

    const body: ApiRecord = {
      card_id: Number(cardId),
      font_label: fontLabel,
      message,
      ...flattenSingleStepAddress(recipient as ApiRecord, "recipient"),
    };

    if (sender != null) {
      if (typeof sender === "number") {
        body.return_address_id = sender;
      } else {
        Object.assign(body, flattenSingleStepAddress(sender as ApiRecord, "sender"));
      }
    }

    if (wishes != null) body.wishes = wishes;
    if (messageAlign != null) body.message_align = messageAlign;
    if (denominationId != null) body.denomination_id = denominationId;
    if (insertId != null) body.insert_id = insertId;
    if (bundleId != null) body.bundle_id = bundleId;
    if (creditCardId != null) body.credit_card_id = creditCardId;
    if (couponCode != null) body.couponCode = couponCode;
    if (dateSend != null) body.date_send = dateSend;
    if (validateAddress != null) body.validate_address = validateAddress;
    if (checkCassBeforeSubmit != null) body.check_cass_before_submit = checkCassBeforeSubmit ? 1 : 0;
    if (deliveryConfirmation != null) body.delivery_confirmation = Number(deliveryConfirmation);
    if (stampOptionId != null) body.stamp_option_id = stampOptionId;
    if (webhookUrl != null) body.webhook_url = webhookUrl;
    if (clientMetadata != null) body.client_metadata = clientMetadata;
    if (suppressWarnings != null) body.supressWarnings = suppressWarnings;

    Object.assign(body, extra);

    return (await this.http.postNonIdempotent("orders/singleStepOrder", body)) as ApiRecord;
  }

  /**
   * Retrieve an order by ID (`orders/details`). The full API order —
   * `card_name`, `address_from`, `price`, `childs`, etc. — is in `raw`.
   */
  async get(orderId: string | number): Promise<Order> {
    const data = await this.http.get("orders/details", { id: orderId });
    const order = isRecord(data) ? data.order : undefined;
    return parseOrder(isRecord(order) ? order : {});
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

/** singleStepOrder takes flat `recipient_*` / `sender_*` fields; already-prefixed keys pass through. */
function flattenSingleStepAddress(data: ApiRecord, prefix: string): ApiRecord {
  if (Object.keys(data).some((k) => k.startsWith(`${prefix}_`))) return { ...data };
  return flattenAddress(data, prefix);
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
