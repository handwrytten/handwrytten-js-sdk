/** Browse and manage gift cards. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, GiftCard } from "../models.js";
import { parseGiftCard } from "../models.js";

export class GiftCardsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all available gift card products. */
  async list(): Promise<GiftCard[]> {
    const data = await this.http.get("giftCards/list");
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseGiftCard);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
