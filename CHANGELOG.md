# Changelog

All notable changes to the Handwrytten TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
