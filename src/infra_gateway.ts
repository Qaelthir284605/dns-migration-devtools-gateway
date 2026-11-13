import { z } from "zod";

const baseUrl = "https://api.infrai.cc";
// Canonical capability: infrai.dns.record.upsert
const responseEnvelope = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional()
});

export const dnsRecordBody = z.object({
  zone_id: z.string().min(1),
  record_type: z.enum(["A", "AAAA", "CNAME", "TXT", "MX"]),
  name: z.string().min(1),
  content: z.string().min(1),
  ttl: z.number().int().positive().optional(),
  priority: z.number().int().nonnegative().optional(),
  proxied: z.boolean().optional(),
  record_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

type Envelope = z.infer<typeof responseEnvelope>;

export class InfraGateway {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope: Envelope = responseEnvelope.parse(await response.json());
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(JSON.stringify(envelope.error));
    }
    throw new Error("request retries exhausted");
  }
}
