/** Low-level HTTP transport for the Handwrytten API. */

import {
  AuthenticationError,
  BadRequestError,
  HandwryttenError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";
import type { ApiRecord } from "./models.js";

export const DEFAULT_BASE_URL = "https://api.handwrytten.com/v2/";
export const DEFAULT_TIMEOUT = 30_000; // ms
export const MAX_RETRIES = 3;
const RETRY_BACKOFF = 1_000; // ms

export interface HttpClientOptions {
  /** Handwrytten API key (legacy auth). Provide either apiKey or accessToken. */
  apiKey?: string;
  /** OAuth2 access token (Bearer auth). Provide either apiKey or accessToken. */
  accessToken?: string;
  baseUrl?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  maxRetries?: number;
  /** Custom fetch implementation (defaults to global `fetch`). */
  fetch?: typeof globalThis.fetch;
}

export class HttpClient {
  readonly apiKey: string | undefined;
  readonly accessToken: string | undefined;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  private readonly _fetch: typeof globalThis.fetch;

  constructor(options: HttpClientOptions) {
    this.apiKey = options.apiKey;
    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "") + "/";
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  // -----------------------------------------------------------------------
  // Public convenience methods
  // -----------------------------------------------------------------------

  async get(path: string, params?: Record<string, string | number>): Promise<unknown> {
    return this.request("GET", path, { params });
  }

  async post(
    path: string,
    body?: ApiRecord,
    idempotencyKey?: string,
  ): Promise<unknown> {
    return this.request("POST", path, { body, idempotencyKey });
  }

  async postMultipart(
    path: string,
    formData: FormData,
  ): Promise<unknown> {
    return this.request("POST", path, { formData });
  }

  async put(path: string, body?: ApiRecord): Promise<unknown> {
    return this.request("PUT", path, { body });
  }

  async delete(path: string, params?: Record<string, string | number>): Promise<unknown> {
    return this.request("DELETE", path, { params });
  }

  // -----------------------------------------------------------------------
  // Core request with retries
  // -----------------------------------------------------------------------

  async request(
    method: string,
    path: string,
    options: {
      params?: Record<string, string | number>;
      body?: ApiRecord;
      formData?: FormData;
      idempotencyKey?: string;
    } = {},
  ): Promise<unknown> {
    const url = new URL(path.replace(/^\/+/, ""), this.baseUrl);

    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: this.accessToken ? `Bearer ${this.accessToken}` : this.apiKey!,
      "User-Agent": "handwrytten-ts/1.3.0",
    };

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    let requestBody: string | FormData | undefined;

    if (options.formData) {
      requestBody = options.formData;
      // Let fetch set Content-Type with boundary
    } else if (options.body) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        let response: Response;
        try {
          response = await this._fetch(url.toString(), {
            method,
            headers,
            body: requestBody,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        return await this._handleResponse(response);
      } catch (error) {
        if (error instanceof RateLimitError || error instanceof ServerError) {
          lastError = error;
          if (attempt < this.maxRetries - 1) {
            let wait = RETRY_BACKOFF * 2 ** attempt;
            if (error instanceof RateLimitError && error.retryAfter) {
              wait = error.retryAfter * 1_000;
            }
            await sleep(wait);
          } else {
            throw error;
          }
        } else if (error instanceof HandwryttenError) {
          throw error;
        } else if (
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          // Network / timeout errors
          const msg =
            error instanceof DOMException
              ? `Request timed out after ${this.timeout}ms`
              : `Connection error: ${(error as Error).message}`;
          lastError = new HandwryttenError(msg);
          if (attempt < this.maxRetries - 1) {
            await sleep(RETRY_BACKOFF * 2 ** attempt);
          } else {
            throw lastError;
          }
        } else {
          throw error;
        }
      }
    }

    throw lastError!;
  }

  // -----------------------------------------------------------------------
  // Response handling
  // -----------------------------------------------------------------------

  private async _handleResponse(response: Response): Promise<unknown> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      const text = await response.text().catch(() => "");
      body = text || null;
    }

    if (response.status >= 500) {
      throw new ServerError(
        extractErrorMessage(body, "Server error"),
        response.status,
        body,
      );
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      throw new RateLimitError(
        "Rate limit exceeded. Please retry after a delay.",
        429,
        body,
        retryAfterHeader ? parseInt(retryAfterHeader, 10) : null,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(
        extractErrorMessage(body, "Authentication failed"),
        response.status,
        body,
      );
    }

    if (response.status === 404) {
      throw new NotFoundError(
        extractErrorMessage(body, "Resource not found"),
        response.status,
        body,
      );
    }

    if (response.status >= 400) {
      throw new BadRequestError(
        extractErrorMessage(body, "Bad request"),
        response.status,
        body,
      );
    }

    return body;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const rec = body as Record<string, unknown>;
    for (const key of ["message", "error", "errors", "detail", "msg"]) {
      if (key in rec) {
        const val = rec[key];
        if (typeof val === "string") return val;
        if (Array.isArray(val) && val.length > 0) return String(val[0]);
        return String(val);
      }
    }
  }
  if (typeof body === "string" && body) return body.slice(0, 200);
  return fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
