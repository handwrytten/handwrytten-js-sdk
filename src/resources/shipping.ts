/** Shipping options (stamp selection). */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, StampOption } from "../models.js";
import { parseStampOption } from "../models.js";

export class ShippingResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get available stamp options for outgoing mail.
   *
   * Returned IDs can be passed as `stampOptionId` on `orders.send()` and
   * `basket.addOrder()` to select between first-class and presorted mail.
   * Stamp options apply to US orders; international orders ignore the field.
   */
  async stampOptions(): Promise<StampOption[]> {
    const data = await this.http.get("shipping/stampOptions");
    const items = toArray(data);
    return items.map(parseStampOption);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toArray(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) return data as ApiRecord[];
  if (isRecord(data)) {
    return ((data.stamp_options ?? data.stampOptions ?? data.results ?? []) as ApiRecord[]);
  }
  return [];
}
