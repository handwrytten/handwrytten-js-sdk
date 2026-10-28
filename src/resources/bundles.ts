/** Browse gift boxes (cookie boxes, etc.) that ship with a card. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Bundle } from "../models.js";
import { parseBundle } from "../models.js";

export class BundlesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get the gift boxes available to your account.
   *
   * Returns an empty array if your account is not allowed to purchase gift
   * boxes (the same permission that governs gift cards).
   */
  async list(): Promise<Bundle[]> {
    const data = await this.http.get("bundles/list");
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.bundles ?? data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseBundle);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
