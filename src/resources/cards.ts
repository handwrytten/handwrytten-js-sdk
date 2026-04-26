/** Browse card and stationery templates. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Card, Category } from "../models.js";
import { parseCard, parseCategory } from "../models.js";

export class CardsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all available card templates. */
  async list(): Promise<Card[]> {
    const data = await this.http.get("cards/list");
    const items = toArray(data);
    return items.map(parseCard);
  }

  /** Get a single card by ID. */
  async get(cardId: string): Promise<Card> {
    const data = await this.http.get(`cards/get/${cardId}`);
    return parseCard(isRecord(data) ? data : {});
  }

  /** Get available card categories. */
  async categories(): Promise<Category[]> {
    const data = await this.http.get("categories/list");
    return toArray(data).map(parseCategory);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toArray(data: unknown): ApiRecord[] {
  if (Array.isArray(data)) return data as ApiRecord[];
  if (isRecord(data)) {
    return ((data.results ?? data.cards ?? data.categories ?? []) as ApiRecord[]);
  }
  return [];
}
