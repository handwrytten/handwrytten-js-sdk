/** Multi-step basket/cart workflow for complex orders. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, DeliveryConfirmation } from "../models.js";
import { flattenAddress } from "./helpers.js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface AddOrderOptions {
  cardId: string;
  message?: string;
  wishes?: string;
  font?: string;
  fontSize?: number;
  autoFontSize?: boolean;
  messageAlign?: string;
  /**
   * List of recipient address objects. Accepts camelCase keys
   * (`firstName`, `lastName`, `street1`, `city`, `state`, `zip`) which are
   * auto-converted to the `to_*` format the API expects. Raw `to_*` keys
   * are also accepted and passed through unchanged.
   */
  addresses?: ApiRecord[];
  /** List of saved address IDs for recipients. */
  addressIds?: number[];
  returnAddressId?: number;
  denominationId?: number;
  insertId?: number;
  signatureId?: number;
  signature2Id?: number;
  dateSend?: string;
  couponCode?: string;
  checkQuantity?: boolean;
  checkQuantityInserts?: boolean;
  /**
   * Delivery confirmation mode. Accepts:
   * - `0` — none (default)
   * - `1` — USPS delivery confirmation
   * - `2` — CASS address validation only
   *
   * Use the {@link DeliveryConfirmation} constant for readability.
   */
  deliveryConfirmation?: DeliveryConfirmation | number;
  /**
   * Stamp option ID selecting first-class vs. presorted mail for US orders.
   * Fetch available options via `client.shipping.stampOptions()`.
   * Ignored for international orders.
   */
  stampOptionId?: number;
  shippingMethodId?: number;
  shippingRateId?: number;
  shippingAddressId?: number;
  mustDeliverBy?: string;
  clientMetadata?: string;
  suppressWarnings?: boolean;
  /** Additional API parameters. */
  [key: string]: unknown;
}

export interface SendBasketOptions {
  couponCode?: string;
  creditCardId?: number;
  testMode?: boolean;
  checkQuantity?: boolean;
  checkCassBeforeSubmit?: boolean;
  notes?: Record<string, string>;
  priceStructure?: Record<string, number>;
  /** Additional API parameters. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class BasketResource {
  constructor(private readonly http: HttpClient) {}

  /** Add an order to the basket (`orders/placeBasket`). */
  async addOrder(options: AddOrderOptions): Promise<ApiRecord> {
    const {
      cardId,
      message,
      wishes,
      font,
      fontSize,
      autoFontSize,
      messageAlign,
      addresses,
      addressIds,
      returnAddressId,
      denominationId,
      insertId,
      signatureId,
      signature2Id,
      dateSend,
      couponCode,
      checkQuantity,
      checkQuantityInserts,
      deliveryConfirmation,
      stampOptionId,
      shippingMethodId,
      shippingRateId,
      shippingAddressId,
      mustDeliverBy,
      clientMetadata,
      suppressWarnings,
      ...extra
    } = options;

    const body: ApiRecord = { card_id: Number(cardId) };

    if (message != null) body.message = message;
    if (wishes != null) body.wishes = wishes;
    if (font != null) body.font = font;
    if (fontSize != null) body.font_size = fontSize;
    if (autoFontSize != null) body.auto_font_size = autoFontSize;
    if (messageAlign != null) body.message_align = messageAlign;

    if (addresses != null) {
      const converted: ApiRecord[] = [];
      for (const addr of addresses) {
        if (hasToPrefix(addr) || "address_id" in addr) {
          converted.push(addr);
        } else {
          const a = { ...addr };
          const rowMessage = a.message;
          const rowWishes = a.wishes;
          delete a.message;
          delete a.wishes;
          const row: ApiRecord = flattenAddress(a, "to");
          if (rowMessage != null) row.message = rowMessage;
          if (rowWishes != null) row.wishes = rowWishes;
          converted.push(row);
        }
      }
      body.addresses = converted;
    }

    if (addressIds != null) body.address_ids = addressIds;
    if (returnAddressId != null) body.return_address_id = returnAddressId;
    if (denominationId != null) body.denomination_id = denominationId;
    if (insertId != null) body.insert_id = insertId;
    if (signatureId != null) body.signature_id = signatureId;
    if (signature2Id != null) body.signature2_id = signature2Id;
    if (dateSend != null) body.date_send = dateSend;
    if (couponCode != null) body.couponCode = couponCode;
    if (checkQuantity != null) body.check_quantity = checkQuantity;
    if (checkQuantityInserts != null) body.check_quantity_inserts = checkQuantityInserts;
    if (deliveryConfirmation != null) body.delivery_confirmation = Number(deliveryConfirmation);
    if (stampOptionId != null) body.stamp_option_id = stampOptionId;
    if (shippingMethodId != null) body.shipping_method_id = shippingMethodId;
    if (shippingRateId != null) body.shipping_rate_id = shippingRateId;
    if (shippingAddressId != null) body.shipping_address_id = shippingAddressId;
    if (mustDeliverBy != null) body.must_deliver_by = mustDeliverBy;
    if (clientMetadata != null) body.client_metadata = clientMetadata;
    if (suppressWarnings != null) body.supressWarnings = suppressWarnings;

    Object.assign(body, extra);

    return (await this.http.post("orders/placeBasket", body)) as ApiRecord;
  }

  /** Remove a single item from the basket. */
  async remove(basketId: number): Promise<ApiRecord> {
    return (await this.http.post("basket/remove", { id: basketId })) as ApiRecord;
  }

  /** Remove all items from the basket. */
  async clear(): Promise<ApiRecord> {
    return (await this.http.post("basket/clear", {})) as ApiRecord;
  }

  /** List all items currently in the basket. */
  async list(): Promise<ApiRecord> {
    return (await this.http.get("basket/allNew")) as ApiRecord;
  }

  /** Get a single basket item by ID. */
  async getItem(basketId: number): Promise<ApiRecord> {
    return (await this.http.get("basket/item", { id: basketId })) as ApiRecord;
  }

  /** Get the number of items currently in the basket. */
  async count(): Promise<number> {
    const data = await this.http.get("basket/count");
    if (isRecord(data)) return Number((data as ApiRecord).count ?? 0);
    return 0;
  }

  /** Submit the basket for processing (`basket/send`). */
  async send(options: SendBasketOptions = {}): Promise<ApiRecord> {
    const {
      couponCode,
      creditCardId,
      testMode,
      checkQuantity,
      checkCassBeforeSubmit,
      notes,
      priceStructure,
      ...extra
    } = options;

    const body: ApiRecord = {};
    if (couponCode != null) body.couponCode = couponCode;
    if (creditCardId != null) body.credit_card_id = creditCardId;
    if (testMode != null) body.test_mode = testMode ? 1 : 0;
    if (checkQuantity != null) body.check_quantity = checkQuantity;
    if (checkCassBeforeSubmit != null) body.check_cass_before_submit = checkCassBeforeSubmit ? 1 : 0;
    if (notes != null) body.notes = notes;
    if (priceStructure != null) body.price_structure = priceStructure;
    Object.assign(body, extra);

    return (await this.http.post("basket/send", body)) as ApiRecord;
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasToPrefix(obj: ApiRecord): boolean {
  return Object.keys(obj).some((k) => k.startsWith("to_"));
}
