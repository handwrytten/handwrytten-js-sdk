/** Upload images and create custom card designs. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, CustomCard, CustomImage, Dimension } from "../models.js";
import { parseCustomCard, parseCustomImage, parseDimension } from "../models.js";

// ---------------------------------------------------------------------------
// Options interfaces
// ---------------------------------------------------------------------------

export interface UploadImageOptions {
  /** Publicly accessible URL of the image (JPEG/PNG/GIF). */
  url?: string;
  /** FormData file field for local uploads (browser) or a Node.js readable stream. */
  file?: FormData;
  /** `"logo"` (writing-side logo) or `"cover"` (full-bleed front/back image). */
  imageType?: string;
}

export interface CreateCustomCardOptions {
  name: string;
  dimensionId: string;
  isUpdate?: boolean;
  // Cover (front)
  coverId?: number;
  presetCoverId?: number;
  coverSizePercent?: number;
  // Header
  headerType?: string;
  headerText?: string;
  headerFontId?: string;
  headerFontSize?: number;
  headerFontColor?: string;
  headerAlign?: string;
  headerLogoId?: number;
  headerLogoSizePercent?: number;
  // Main (folded cards only)
  mainType?: string;
  mainText?: string;
  mainFontId?: string;
  mainFontSize?: number;
  mainFontColor?: string;
  mainAlign?: string;
  mainLogoId?: number;
  mainLogoSizePercent?: number;
  // Footer
  footerType?: string;
  footerText?: string;
  footerFontId?: string;
  footerFontSize?: number;
  footerFontColor?: string;
  footerAlign?: string;
  footerLogoId?: number;
  footerLogoSizePercent?: number;
  // Back
  backCoverId?: number;
  presetBackCoverId?: number;
  backType?: string;
  backAlign?: string;
  backVerticalAlign?: string;
  backLogoId?: number;
  backText?: string;
  backFontId?: number;
  backFontSize?: number;
  backFontColor?: string;
  backSizePercent?: number;
  // QR Code
  qrCodeId?: number;
  qrCodeSizePercent?: number;
  qrCodeAlign?: string;
  qrCodeLocation?: string;
  qrCodeFrameId?: number;
  /** Additional API parameters. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class CustomCardsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get customizable card dimensions. */
  async dimensions(options?: {
    format?: string;
    orientation?: string;
  }): Promise<Dimension[]> {
    const data = await this.http.get("design/dimensions");
    let items: ApiRecord[];
    if (isRecord(data)) {
      items = ((data.dimensions ?? data.results ?? []) as ApiRecord[]);
    } else if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else {
      items = [];
    }

    let dims = items.map(parseDimension);
    if (options?.format) dims = dims.filter((d) => d.format === options.format);
    if (options?.orientation) dims = dims.filter((d) => d.orientation === options.orientation);
    return dims;
  }

  /**
   * Upload a custom image for use with custom cards.
   *
   * Provide **one** of `url` or `file`.
   */
  async uploadImage(options: UploadImageOptions): Promise<CustomImage> {
    const imageType = options.imageType ?? "logo";

    if (options.url && options.file) {
      throw new Error("Provide either url or file, not both");
    }
    if (!options.url && !options.file) {
      throw new Error("Provide either url or file");
    }

    let data: unknown;
    if (options.url) {
      data = await this.http.post("cards/uploadCustomLogo", {
        url: options.url,
        type: imageType,
      });
    } else {
      data = await this.http.postMultipart("cards/uploadCustomLogo", options.file!);
    }

    return parseCustomImage(isRecord(data) ? data : {});
  }

  /** Check if an uploaded image meets quality requirements. */
  async checkImage(
    imageId: number,
    cardId?: number,
  ): Promise<ApiRecord> {
    const body: ApiRecord = { image_id: imageId };
    if (cardId != null) body.card_id = cardId;
    return (await this.http.post(
      "cards/checkUploadedCustomLogo",
      body,
    )) as ApiRecord;
  }

  /** List previously uploaded custom images. */
  async listImages(imageType?: string): Promise<CustomImage[]> {
    const params: Record<string, string> = {};
    if (imageType != null) params.type = imageType;
    const data = await this.http.get("cards/listCustomUserImages", params);

    let items: ApiRecord[];
    if (isRecord(data)) {
      items = (data.images ?? []) as ApiRecord[];
    } else if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else {
      items = [];
    }
    return items.map(parseCustomImage);
  }

  /** Delete an uploaded custom image. */
  async deleteImage(imageId: number): Promise<ApiRecord> {
    return (await this.http.post("cards/deleteCustomLogo", {
      image_id: imageId,
    })) as ApiRecord;
  }

  /** Create a custom card from uploaded images and text. */
  async create(options: CreateCustomCardOptions): Promise<CustomCard> {
    const {
      name,
      dimensionId,
      isUpdate,
      coverId,
      presetCoverId,
      coverSizePercent,
      headerType,
      headerText,
      headerFontId,
      headerFontSize,
      headerFontColor,
      headerAlign,
      headerLogoId,
      headerLogoSizePercent,
      mainType,
      mainText,
      mainFontId,
      mainFontSize,
      mainFontColor,
      mainAlign,
      mainLogoId,
      mainLogoSizePercent,
      footerType,
      footerText,
      footerFontId,
      footerFontSize,
      footerFontColor,
      footerAlign,
      footerLogoId,
      footerLogoSizePercent,
      backCoverId,
      presetBackCoverId,
      backType,
      backAlign,
      backVerticalAlign,
      backLogoId,
      backText,
      backFontId,
      backFontSize,
      backFontColor,
      backSizePercent,
      qrCodeId,
      qrCodeSizePercent,
      qrCodeAlign,
      qrCodeLocation,
      qrCodeFrameId,
      ...extra
    } = options;

    const body: ApiRecord = { name, dimension_id: dimensionId };

    const optional: Record<string, unknown> = {
      is_update: isUpdate,
      cover_id: coverId,
      preset_cover_id: presetCoverId,
      cover_size_percent: coverSizePercent,
      header_type: headerType,
      header_text: headerText,
      header_font_id: headerFontId,
      header_font_size: headerFontSize,
      header_font_color: headerFontColor,
      header_align: headerAlign,
      header_logo_id: headerLogoId,
      header_logo_size_percent: headerLogoSizePercent,
      main_type: mainType,
      main_text: mainText,
      main_font_id: mainFontId,
      main_font_size: mainFontSize,
      main_font_color: mainFontColor,
      main_align: mainAlign,
      main_logo_id: mainLogoId,
      main_logo_size_percent: mainLogoSizePercent,
      footer_type: footerType,
      footer_text: footerText,
      footer_font_id: footerFontId,
      footer_font_size: footerFontSize,
      footer_font_color: footerFontColor,
      footer_align: footerAlign,
      footer_logo_id: footerLogoId,
      footer_logo_size_percent: footerLogoSizePercent,
      back_cover_id: backCoverId,
      preset_back_cover_id: presetBackCoverId,
      back_type: backType,
      back_align: backAlign,
      back_vertical_align: backVerticalAlign,
      back_logo_id: backLogoId,
      back_text: backText,
      back_font_id: backFontId,
      back_font_size: backFontSize,
      back_font_color: backFontColor,
      back_size_percent: backSizePercent,
      qr_code_id: qrCodeId,
      qr_code_size_percent: qrCodeSizePercent,
      qr_code_align: qrCodeAlign,
      qr_code_location: qrCodeLocation,
      qr_code_frame_id: qrCodeFrameId,
    };

    for (const [k, v] of Object.entries(optional)) {
      if (v != null) body[k] = v;
    }
    Object.assign(body, extra);

    const data = await this.http.post("cards/createCustomCard", body);
    return parseCustomCard(isRecord(data) ? data : {});
  }

  /** Delete a custom card. */
  async delete(cardId: number): Promise<ApiRecord> {
    return (await this.http.post("design/delete", { id: cardId })) as ApiRecord;
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
