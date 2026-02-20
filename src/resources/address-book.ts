/** Manage saved addresses, countries, and states. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, Country, SavedAddress, State } from "../models.js";
import { parseCountry, parseSavedAddress, parseState } from "../models.js";

// ---------------------------------------------------------------------------
// Option interfaces
// ---------------------------------------------------------------------------

export interface AddRecipientOptions {
  firstName: string;
  lastName: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  street2?: string;
  company?: string;
  countryId?: string;
  birthday?: string;
  anniversary?: string;
  allowPoor?: boolean;
}

export interface UpdateRecipientOptions {
  addressId: number;
  firstName?: string;
  lastName?: string;
  street1?: string;
  city?: string;
  state?: string;
  zip?: string;
  street2?: string;
  company?: string;
  countryId?: string;
  birthday?: string;
  anniversary?: string;
  allowPoor?: boolean;
}

export interface AddSenderOptions {
  firstName: string;
  lastName: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  street2?: string;
  company?: string;
  countryId?: string;
  default?: boolean;
  allowPoor?: boolean;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class AddressBookResource {
  constructor(private readonly http: HttpClient) {}

  // -- Recipients ----------------------------------------------------------

  /** List saved recipient addresses. */
  async listRecipients(): Promise<SavedAddress[]> {
    const data = await this.http.get("profile/recipientsList");
    let items: ApiRecord[];
    if (isRecord(data)) {
      items = (data.addresses ?? []) as ApiRecord[];
    } else if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else {
      items = [];
    }
    return items.map(parseSavedAddress);
  }

  /** Save a new recipient address to the address book. Returns the saved address ID. */
  async addRecipient(options: AddRecipientOptions): Promise<number> {
    const body: ApiRecord = {
      first_name: options.firstName,
      last_name: options.lastName,
      address1: options.street1,
      city: options.city,
      state: options.state,
      zip: options.zip,
    };
    if (options.street2 != null) body.address2 = options.street2;
    if (options.company != null) body.business_name = options.company;
    if (options.countryId != null) body.country_id = options.countryId;
    if (options.birthday != null) body.birthday = options.birthday;
    if (options.anniversary != null) body.anniversary = options.anniversary;
    if (options.allowPoor != null) body.allow_poor = options.allowPoor;

    const data = await this.http.post("profile/addRecipient", body);
    if (isRecord(data)) {
      const addr = (isRecord(data.address) ? data.address : data) as ApiRecord;
      return Number(addr.id ?? addr.address_id ?? 0);
    }
    return 0;
  }

  /** Update an existing recipient address. Returns the address ID. */
  async updateRecipient(options: UpdateRecipientOptions): Promise<number> {
    const body: ApiRecord = { id: options.addressId };
    if (options.firstName != null) body.first_name = options.firstName;
    if (options.lastName != null) body.last_name = options.lastName;
    if (options.street1 != null) body.address1 = options.street1;
    if (options.city != null) body.city = options.city;
    if (options.state != null) body.state = options.state;
    if (options.zip != null) body.zip = options.zip;
    if (options.street2 != null) body.address2 = options.street2;
    if (options.company != null) body.business_name = options.company;
    if (options.countryId != null) body.country_id = options.countryId;
    if (options.birthday != null) body.birthday = options.birthday;
    if (options.anniversary != null) body.anniversary = options.anniversary;
    if (options.allowPoor != null) body.allow_poor = options.allowPoor;

    const data = await this.http.put("profile/updateRecipient", body);
    if (isRecord(data)) {
      const addr = (isRecord(data.address) ? data.address : data) as ApiRecord;
      return Number(addr.id ?? addr.address_id ?? options.addressId);
    }
    return options.addressId;
  }

  /**
   * Delete one or more saved recipient addresses.
   *
   * Provide **one** of `addressId` (single) or `addressIds` (batch).
   */
  async deleteRecipient(options: {
    addressId?: number;
    addressIds?: number[];
  }): Promise<ApiRecord> {
    const body: ApiRecord = {};
    if (options.addressId != null) body.address_id = options.addressId;
    if (options.addressIds != null) body.address_ids = options.addressIds;
    return (await this.http.post("profile/deleteRecipient", body)) as ApiRecord;
  }

  // -- Senders -------------------------------------------------------------

  /** List saved sender (return) addresses. */
  async listSenders(): Promise<SavedAddress[]> {
    const data = await this.http.get("profile/listAddresses");
    let items: ApiRecord[];
    if (isRecord(data)) {
      // API response key has a typo ("addressses" with triple 's')
      items = ((data.addressses ?? data.addresses ?? []) as ApiRecord[]);
    } else if (Array.isArray(data)) {
      items = data as ApiRecord[];
    } else {
      items = [];
    }
    return items.map(parseSavedAddress);
  }

  /** Save a new sender (return) address. Returns the saved address ID. */
  async addSender(options: AddSenderOptions): Promise<number> {
    const body: ApiRecord = {
      first_name: options.firstName,
      last_name: options.lastName,
      address1: options.street1,
      city: options.city,
      state: options.state,
      zip: options.zip,
    };
    if (options.street2 != null) body.address2 = options.street2;
    if (options.company != null) body.business_name = options.company;
    if (options.countryId != null) body.country_id = options.countryId;
    if (options.default != null) body.default = options.default;
    if (options.allowPoor != null) body.allow_poor = options.allowPoor;

    const data = await this.http.post("profile/createAddress", body);
    if (isRecord(data)) {
      const addr = (isRecord(data.address) ? data.address : data) as ApiRecord;
      return Number(addr.id ?? addr.address_id ?? 0);
    }
    return 0;
  }

  /**
   * Delete one or more saved sender (return) addresses.
   *
   * Provide **one** of `addressId` (single) or `addressIds` (batch).
   */
  async deleteSender(options: {
    addressId?: number;
    addressIds?: number[];
  }): Promise<ApiRecord> {
    const body: ApiRecord = {};
    if (options.addressId != null) body.address_id = options.addressId;
    if (options.addressIds != null) body.address_ids = options.addressIds;
    return (await this.http.post("profile/deleteAddress", body)) as ApiRecord;
  }

  // -- Countries & States --------------------------------------------------

  /** Get all supported countries. */
  async countries(): Promise<Country[]> {
    const data = await this.http.get("countries/list");
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseCountry);
  }

  /** Get states/provinces for a country. */
  async states(countryCode = "US"): Promise<State[]> {
    const data = await this.http.get("states/list", { country: countryCode });
    const items = Array.isArray(data)
      ? (data as ApiRecord[])
      : isRecord(data)
        ? ((data.results ?? []) as ApiRecord[])
        : [];
    return items.map(parseState);
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
