/** Target prospecting endpoints. */

import type { HttpClient } from "../http-client.js";
import type { ApiRecord } from "../models.js";

export interface CalculateTargetsOptions {
  zipCode: string;
  radiusMiles?: number;
  /** Additional filter parameters. */
  [key: string]: unknown;
}

export class ProspectingResource {
  constructor(private readonly http: HttpClient) {}

  /** Calculate prospecting targets in an area. */
  async calculateTargets(options: CalculateTargetsOptions): Promise<ApiRecord> {
    const { zipCode, radiusMiles = 10, ...kwargs } = options;
    return (await this.http.post("prospecting/calculateTargets", {
      zip: zipCode,
      radius: radiusMiles,
      ...kwargs,
    })) as ApiRecord;
  }
}
