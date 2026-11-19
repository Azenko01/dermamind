import { OBF_FIELDS, type ObfRecord } from '@dermamind/scoring';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../config';

export const OBF_USER_AGENT = 'DermaMind/1.0 (diploma project)';

/** Outgoing calls per minute for the whole server — OBF asks for ≤ 100 product reads a minute. */
const MAX_CALLS_PER_MINUTE = 60;

export type ObfLookup =
  | { kind: 'found'; record: ObfRecord }
  | { kind: 'not_found' }
  /** timeout, network error, 5xx, our own limit or turned off — don't remember it as a miss */
  | { kind: 'unavailable' };

/** Open Beauty Facts read API, one product by barcode (scanner fallback, PLAN.md 6.5 flow 2). */
@Injectable()
export class ObfClient {
  private readonly log = new Logger(ObfClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private calls: number[] = [];

  constructor(config: ConfigService<AppEnv, true>) {
    this.baseUrl = config.get('obfApiUrl', { infer: true });
    this.timeoutMs = config.get('obfTimeoutMs', { infer: true });
  }

  async product(ean: string): Promise<ObfLookup> {
    if (!this.baseUrl || !this.takeSlot()) return { kind: 'unavailable' };
    const url = `${this.baseUrl}/api/v2/product/${encodeURIComponent(ean)}.json?fields=${OBF_FIELDS.join(',')}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': OBF_USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (res.status === 404) return { kind: 'not_found' };
      if (!res.ok) return { kind: 'unavailable' };
      const body = (await res.json()) as { status?: number; product?: ObfRecord };
      if (body.status !== 1 || !body.product) return { kind: 'not_found' };
      return { kind: 'found', record: { ...body.product, code: ean } };
    } catch (err) {
      this.log.warn(`OBF lookup failed for ${ean}: ${(err as Error).name}`);
      return { kind: 'unavailable' };
    }
  }

  /** Sliding one-minute window shared by all users. */
  private takeSlot(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter((t) => now - t < 60_000);
    if (this.calls.length >= MAX_CALLS_PER_MINUTE) return false;
    this.calls.push(now);
    return true;
  }
}
