# Changelog

All notable changes to the Handwrytten TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-22

### Added

- **Stamp options** — select first-class vs. presorted mail for US orders
  - `client.shipping.stampOptions()` — list available stamp options from `GET /shipping/stampOptions`
  - `stampOptionId` option on `client.orders.send()` and `client.basket.addOrder()` — maps to `stamp_option_id` on the API (ignored for international orders)
  - New `StampOption` type and `parseStampOption()` exported from the package
- **`DeliveryConfirmation` constant** — readable values (`NONE`, `DELIVERY_CONFIRMATION`, `CASS_VALIDATION`) for the new integer-valued delivery-confirmation field
- Updated `User-Agent` string to `handwrytten-ts/1.4.0`

### Changed

- `deliveryConfirmation` on `client.orders.send()` and `client.basket.addOrder()` is now `number` (0/1/2) instead of `boolean`, matching the API's new tri-state field: `0` = none, `1` = USPS delivery confirmation, `2` = CASS address validation only. The API still casts `true`/`false` to `1`/`0` server-side, so prior runtime behavior is preserved — but TypeScript callers passing a `boolean` will now see a type error and should switch to `1`/`0` or the `DeliveryConfirmation` constant.

### Fixed

- `client.orders.send()` now forwards top-level `message` and `wishes` to `orders/placeBasket` so saved-address recipients (numeric IDs via `recipient: 12345` or `recipient: [1, 2, 3]`) receive the message. Previously these fields only reached inline dict recipients, and saved-address recipients were mailed with an empty message. Inline dict recipients continue to carry their own per-row overrides.
- `client.orders.send()` now rejects a `recipient` array that mixes saved-address IDs with inline address objects — callers must pick one form. The behavior of `orders/placeBasket` on mixed input is undefined; failing fast at the SDK layer is safer than silently sending partial data.

## [1.3.0] - 2026-03-13

### Added

- **OAuth2 access token authentication** — the `Handwrytten` client now accepts an `accessToken` option as an alternative to `apiKey`. When used, the SDK sends `Authorization: Bearer {token}` headers, enabling OAuth2 workflows.
  - `new Handwrytten({ accessToken: "oauth_token" })` — create a client using an OAuth2 access token
  - `new Handwrytten("api_key")` — existing API key auth continues to work unchanged
  - Both `apiKey` and `accessToken` are exported in the `HandwryttenOptions` type
- Updated `User-Agent` string to `handwrytten-ts/1.3.0`

## [1.2.0] - 2026-02-20

### Added

- **Gift card denominations** — `GiftCard` now includes a `denominations` array with price points (id, nominal value, price)
- **Denomination type** — new `Denomination` interface and `parseDenomination()` exported from the package
- **Signature type** — new `Signature` interface and `parseSignature()` for saved handwriting signatures
- `client.auth.listSignatures()` — list the user's saved handwriting signatures
- `client.customCards.get(cardId)` — get details of a custom card
- `client.orders.listPastBaskets(options)` — list previously submitted baskets
- `client.addressBook.deleteRecipient({ addressId, addressIds })` — delete saved recipient addresses (single or batch)
- `client.addressBook.deleteSender({ addressId, addressIds })` — delete saved sender addresses (single or batch)
- `client.inserts.list({ includeHistorical })` — optional flag to include historical inserts

### Fixed

- Gift card list now correctly extracts items from `gcards` key in API response
- Inserts list now correctly extracts items from `inserts` key in API response

## [1.1.0] - 2026-02-18

### Added

- Initial release of the Handwrytten TypeScript SDK
- Full Handwrytten API v2 coverage matching the Python SDK
  - Authentication (`client.auth`)
  - Cards and custom cards (`client.cards`, `client.customCards`)
  - Handwriting fonts (`client.fonts`)
  - Orders with single-step and batch sending (`client.orders`)
  - Gift cards, inserts, QR codes (`client.giftCards`, `client.inserts`, `client.qrCodes`)
  - Address book with countries and states (`client.addressBook`)
  - Basket workflow (`client.basket`)
  - Prospecting (`client.prospecting`)
- Dual ESM/CJS output with full TypeScript declarations
- Typed data models with `raw` property for unmapped fields
- Automatic retries with exponential backoff for 429s, 5xx, and connection errors
- Structured error hierarchy: `AuthenticationError`, `BadRequestError`, `NotFoundError`, `RateLimitError`, `ServerError`
- Zero runtime dependencies (uses native `fetch`)
