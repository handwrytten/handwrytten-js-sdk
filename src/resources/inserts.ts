/** Browse card inserts (business cards, flyers, etc.). */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Insert } from "../models.js";
import { parseInsert } from "../models.js";

export class InsertsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get all available inserts.
   *
   * @param options.includeHistorical - If `true`, also return inserts that
   *   are no longer available for new orders.
   */
  async list(options?: { includeHistorical?: boolean }): Promise<Insert[]> {
    const params: Record<string, string | number> = {};
    if (options?.includeHistorical) params.include_historical = 1;
    const data = await this.http.get("inserts/list", params);
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.inserts ?? data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseInsert);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
