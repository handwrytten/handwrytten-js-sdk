/** Shared helpers for resource classes. */

import type { ApiRecord } from "../models.js";

/** Map of camelCase address keys to API field suffixes. */
const CAMEL_TO_API: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  street1: "address1",
  street2: "address2",
  company: "business_name",
  city: "city",
  state: "state",
  zip: "zip",
  country: "country",
};

/**
 * Flatten a camelCase address object into `{prefix}_{field}` API fields.
 *
 * Keys that already start with `return_` are passed through as-is
 * (inline return-address fields like `return_first_name`).
 *
 * @example
 * flattenAddress({ firstName: "Jane", city: "Phoenix" }, "to")
 * // => { to_first_name: "Jane", to_city: "Phoenix" }
 */
export function flattenAddress(
  data: ApiRecord,
  prefix: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    if (key.startsWith("return_")) {
      result[key] = String(value);
    } else {
      const apiSuffix = CAMEL_TO_API[key] ?? key;
      result[`${prefix}_${apiSuffix}`] = String(value);
    }
  }
  return result;
}
