/** Create, list, and manage QR codes. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, QRCode } from "../models.js";
import { parseQRCode } from "../models.js";

export interface CreateQRCodeOptions {
  name: string;
  url: string;
  iconId?: number;
  webhookUrl?: string;
}

export class QRCodesResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all QR codes associated with your account. */
  async list(): Promise<QRCode[]> {
    const data = await this.http.get("qrCodes/list");
    let items: ApiRecord[];
    if (isRecord(data)) {
      items = ((data.list ?? data.results ?? []) as ApiRecord[]);
    } else if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else {
      items = [];
    }
    return items.map(parseQRCode);
  }

  /** Create a new QR code. */
  async create(options: CreateQRCodeOptions): Promise<QRCode> {
    const body: ApiRecord = { name: options.name, url: options.url };
    if (options.iconId != null) body.icon_id = options.iconId;
    if (options.webhookUrl != null) body.webhook_url = options.webhookUrl;

    const data = await this.http.post("qrCode/", body);
    if (isRecord(data)) {
      if ("id" in data && !("url" in data)) {
        return { id: String(data.id), url: options.url, title: options.name, raw: data };
      }
      return parseQRCode(data);
    }
    return { id: "0", url: options.url, title: options.name, raw: {} };
  }

  /** Delete a QR code. */
  async delete(qrCodeId: number): Promise<ApiRecord> {
    return (await this.http.delete(`qrCode/${qrCodeId}/`)) as ApiRecord;
  }

  /**
   * Get available QR code frames.
   *
   * Frames are decorative borders placed around a QR code on the card.
   * Pass a frame `id` to `customCards.create()` via the `qrCodeFrameId` parameter.
   */
  async frames(): Promise<ApiRecord[]> {
    const data = await this.http.get("qrCode/frames/");
    if (isRecord(data)) return (data.frames ?? []) as ApiRecord[];
    if (Array.isArray(data)) return data as ApiRecord[];
    return [];
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
