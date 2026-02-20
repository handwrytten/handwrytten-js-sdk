/** Data models for Handwrytten API responses. */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Any plain JS object from the API. */
export type ApiRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  credits?: number;
  /** The raw API response. */
  raw: ApiRecord;
}

export function parseUser(data: ApiRecord): User {
  return {
    id: String(data.id ?? data.uid ?? ""),
    email: (data.email as string) ?? undefined,
    firstName: (data.first_name as string) ?? (data.firstName as string) ?? undefined,
    lastName: (data.last_name as string) ?? (data.lastName as string) ?? undefined,
    company: (data.company as string) ?? undefined,
    credits: data.credits != null ? Number(data.credits) : undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface Card {
  id: string;
  title: string;
  imageUrl?: string;
  category?: string;
  cover?: string;
  raw: ApiRecord;
}

export function parseCard(data: ApiRecord): Card {
  return {
    id: String(data.id ?? ""),
    title: (data.title as string) ?? (data.name as string) ?? "",
    imageUrl:
      (data.image_url as string) ||
      (data.image as string) ||
      (data.cover as string) ||
      undefined,
    category: (data.category as string) || (data.product_type as string) || undefined,
    cover: (data.cover as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------

export interface Font {
  id: string;
  name: string;
  label: string;
  previewUrl?: string;
  raw: ApiRecord;
}

export function parseFont(data: ApiRecord): Font {
  return {
    id: String(data.id ?? ""),
    name: (data.name as string) ?? (data.title as string) ?? "",
    label: (data.label as string) ?? (data.name as string) ?? "",
    previewUrl:
      (data.preview_url as string) ||
      (data.image as string) ||
      (data.preview as string) ||
      undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Denomination (gift card price point)
// ---------------------------------------------------------------------------

export interface Denomination {
  id: number;
  nominal: number;
  price: number;
  raw: ApiRecord;
}

export function parseDenomination(data: ApiRecord): Denomination {
  return {
    id: Number(data.id ?? 0),
    nominal: Number(data.nominal ?? 0),
    price: Number(data.price ?? 0),
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Gift Card
// ---------------------------------------------------------------------------

export interface GiftCard {
  id: string;
  title: string;
  amount?: number;
  imageUrl?: string;
  denominations: Denomination[];
  raw: ApiRecord;
}

export function parseGiftCard(data: ApiRecord): GiftCard {
  const denomsRaw = data.denominations;
  const denominations = Array.isArray(denomsRaw)
    ? (denomsRaw as ApiRecord[]).map(parseDenomination)
    : [];
  return {
    id: String(data.id ?? ""),
    title: (data.title as string) ?? (data.name as string) ?? "",
    amount:
      data.amount != null ? Number(data.amount) : data.value != null ? Number(data.value) : undefined,
    imageUrl: (data.image_url as string) || (data.image as string) || undefined,
    denominations,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------

export interface Insert {
  id: string;
  title: string;
  imageUrl?: string;
  raw: ApiRecord;
}

export function parseInsert(data: ApiRecord): Insert {
  return {
    id: String(data.id ?? ""),
    title: (data.title as string) ?? (data.name as string) ?? "",
    imageUrl: (data.image_url as string) || (data.image as string) || undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// QR Code
// ---------------------------------------------------------------------------

export interface QRCode {
  id: string;
  url?: string;
  title?: string;
  raw: ApiRecord;
}

export function parseQRCode(data: ApiRecord): QRCode {
  return {
    id: String(data.id ?? ""),
    url: (data.url as string) ?? undefined,
    title: (data.title as string) || (data.name as string) || undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export interface Order {
  id: string;
  status?: string;
  message?: string;
  cardId?: string;
  fontId?: string;
  createdAt?: string;
  trackingNumber?: string;
  raw: ApiRecord;
}

export function parseOrder(data: ApiRecord): Order {
  return {
    id: String(data.id ?? data.order_id ?? ""),
    status: (data.status as string) ?? undefined,
    message: (data.message as string) ?? undefined,
    cardId: data.card_id ? String(data.card_id) : undefined,
    fontId: data.font_id ? String(data.font_id) : undefined,
    createdAt: (data.created_at as string) ?? (data.createdAt as string) ?? undefined,
    trackingNumber: (data.tracking_number as string) ?? (data.trackingNumber as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Dimension (for custom cards)
// ---------------------------------------------------------------------------

export interface Dimension {
  id: number;
  orientation: string;
  format: string;
  openWidth: string;
  openHeight: string;
  name?: string;
  raw: ApiRecord;
}

export function parseDimension(data: ApiRecord): Dimension {
  return {
    id: Number(data.id ?? 0),
    orientation: (data.orientation as string) ?? "",
    format: (data.format as string) ?? "",
    openWidth: (data.open_width as string) ?? "",
    openHeight: (data.open_height as string) ?? "",
    name: (data.name as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Custom Image
// ---------------------------------------------------------------------------

export interface CustomImage {
  id: number;
  imageUrl?: string;
  imageType?: string;
  raw: ApiRecord;
}

export function parseCustomImage(data: ApiRecord): CustomImage {
  return {
    id: Number(data.id ?? 0),
    imageUrl:
      (data.src as string) ||
      (data.image_url as string) ||
      (data.url as string) ||
      undefined,
    imageType: (data.type as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Custom Card
// ---------------------------------------------------------------------------

export interface CustomCard {
  cardId: number;
  categoryId?: number;
  raw: ApiRecord;
}

export function parseCustomCard(data: ApiRecord): CustomCard {
  return {
    cardId: Number(data.card_id ?? data.id ?? 0),
    categoryId: data.category_id != null ? Number(data.category_id) : undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Saved Address
// ---------------------------------------------------------------------------

export interface SavedAddress {
  id: number;
  firstName?: string;
  lastName?: string;
  company?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  raw: ApiRecord;
}

export function parseSavedAddress(data: ApiRecord): SavedAddress {
  return {
    id: Number(data.id ?? 0),
    firstName: (data.first_name as string) ?? undefined,
    lastName: (data.last_name as string) ?? undefined,
    company: (data.business_name as string) ?? undefined,
    street1: (data.address1 as string) ?? undefined,
    street2: (data.address2 as string) ?? undefined,
    city: (data.city as string) ?? undefined,
    state: (data.state as string) || (data.states as string) || undefined,
    zip: data.zip != null ? String(data.zip) : undefined,
    country: (data.country as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

export interface Signature {
  id: number;
  preview?: string;
  raw: ApiRecord;
}

export function parseSignature(data: ApiRecord): Signature {
  return {
    id: Number(data.id ?? 0),
    preview: (data.preview as string) ?? undefined,
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Country & State
// ---------------------------------------------------------------------------

export interface Country {
  code: string;
  name: string;
  raw: ApiRecord;
}

export function parseCountry(data: ApiRecord): Country {
  return {
    code: (data.code as string) ?? (data.id as string) ?? "",
    name: (data.name as string) ?? "",
    raw: data,
  };
}

export interface State {
  code: string;
  name: string;
  raw: ApiRecord;
}

export function parseState(data: ApiRecord): State {
  return {
    code: (data.code as string) ?? (data.abbreviation as string) ?? "",
    name: (data.name as string) ?? "",
    raw: data,
  };
}

// ---------------------------------------------------------------------------
// Recipient & Sender (input types for orders.send())
// ---------------------------------------------------------------------------

export interface Recipient {
  firstName: string;
  lastName: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  street2?: string;
  company?: string;
  country?: string;
}

export interface Sender {
  firstName: string;
  lastName: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  street2?: string;
  company?: string;
  country?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Content type for a custom card zone (header, main, footer, back). */
export const ZoneType = {
  TEXT: "text",
  LOGO: "logo",
  /** Back zone only. */
  COVER: "cover",
} as const;
export type ZoneType = (typeof ZoneType)[keyof typeof ZoneType];

/** Valid locations for placing a QR code on a custom card. */
export const QRCodeLocation = {
  HEADER: "header",
  FOOTER: "footer",
  MAIN: "main",
} as const;
export type QRCodeLocation = (typeof QRCodeLocation)[keyof typeof QRCodeLocation];
