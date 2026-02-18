/** Authentication and user profile endpoints. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord, User } from "../models.js";
import { parseUser } from "../models.js";

export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the authenticated user's profile. */
  async getUser(): Promise<User> {
    const data = await this.http.get("auth/getUser");
    return parseUser(isRecord(data) ? data : {});
  }

  /**
   * Authenticate with email/password and retrieve a UID.
   *
   * Most integrations should use an API key instead.
   */
  async login(email: string, password: string): Promise<ApiRecord> {
    return (await this.http.post("auth/authorization", {
      login: email,
      password,
    })) as ApiRecord;
  }
}

function isRecord(v: unknown): v is ApiRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
