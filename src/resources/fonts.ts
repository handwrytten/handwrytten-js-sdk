/** Browse handwriting styles (fonts). */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Font } from "../models.js";
import { parseFont } from "../models.js";

export class FontsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all available handwriting fonts. */
  async list(): Promise<Font[]> {
    const data = await this.http.get("fonts/list");
    const items = toArray(data);
    return items.map(parseFont);
  }

  /**
   * Get fonts available for the card customizer.
   *
   * These are printed/typeset fonts used in custom card design
   * (header, footer, main, back text) — different from the handwriting
   * fonts returned by `list()`.
   */
  async listForCustomizer(): Promise<ApiRecord[]> {
    const data = await this.http.get("fonts/listForCustomizer");
    if (isRecord(data)) return (data.fonts ?? []) as ApiRecord[];
    if (Array.isArray(data)) return data as ApiRecord[];
    return [];
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toArray(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) return data as ApiRecord[];
  if (isRecord(data)) return ((data.results ?? data.fonts ?? []) as ApiRecord[]);
  return [];
}
