/** Browse card inserts (business cards, flyers, etc.). */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Insert } from "../models.js";
import { parseInsert } from "../models.js";

export class InsertsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all available inserts. */
  async list(): Promise<Insert[]> {
    const data = await this.http.get("inserts/list");
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseInsert);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
