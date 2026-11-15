/** ADR-002 · SEC-001: fixed destinations, request-only secrets and bounded I/O. */
export const AI_PROVIDERS = {
  cityu: { label: "CityU CSLab", baseUrl: "https://llm.cs.cityu.edu.hk/v1", defaultModel: "CS5351/DeepSeek-V4-Flash" },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-flash" },
} as const;
export type AiProvider = keyof typeof AI_PROVIDERS;
export const DEFAULT_CANVAS_BASE_URL = "https://canvas.cityu.edu.hk";

export class ProviderError extends Error {
  code: "invalid-input" | "unauthorised" | "rate-limited" | "unavailable" | "timeout" | "invalid-response" | "limit";
  constructor(code: ProviderError["code"], message: string) { super(message); this.name = "ProviderError"; this.code = code; }
}

function secureUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new ProviderError("invalid-input", "Enter a valid HTTPS service address."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || url.search) {
    throw new ProviderError("invalid-input", "The service address must use HTTPS without credentials, ports or query parameters.");
  }
  return url;
}

/** SEC-001: an operator can add exact public Canvas hosts; users cannot alter this list. */
export function canvasAllowedHosts(value?: string): string[] {
  const hosts = [new URL(DEFAULT_CANVAS_BASE_URL).hostname];
  for (const item of (value || "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)) {
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(item) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(item)) continue;
    hosts.push(item);
  }
  return [...new Set(hosts)];
}

export function assertCanvasBaseUrl(value: string, allowedHosts = canvasAllowedHosts()): string {
  const url = secureUrl(value);
  if (!allowedHosts.includes(url.hostname) || url.pathname !== "/") {
    throw new ProviderError("invalid-input", "This Canvas address is not enabled by the application operator.");
  }
  return url.origin;
}

export function assertAiBaseUrl(provider: AiProvider, value?: string): string {
  if (!Object.hasOwn(AI_PROVIDERS, provider)) throw new ProviderError("invalid-input", "Select a supported AI service.");
  const expected = AI_PROVIDERS[provider].baseUrl;
  if (!value) return expected;
  const url = secureUrl(value);
  if (url.href.replace(/\/$/, "") !== expected) throw new ProviderError("invalid-input", "The AI service address does not match the selected provider.");
  return expected;
}

export function validateCredential(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 4096 || /[\s\x00-\x1f\x7f]/.test(value)) {
    throw new ProviderError("invalid-input", "Enter a valid access key without whitespace.");
  }
  return value;
}

/** SEC-001: no cross-origin browser callers and no shared HTTP cache for private data. */
export function assertSameOrigin(request: Request): void {
  const target = new URL(request.url);
  if (target.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
    throw new ProviderError("invalid-input", "Use HTTPS when connecting personal credentials.");
  }
  const origin = request.headers.get("origin");
  if ((origin && origin !== target.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ProviderError("invalid-input", "This request must originate from StudyPilot.");
  }
}

export const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "no-store, private", "Vary": "Origin", "X-Content-Type-Options": "nosniff" };

async function boundedText(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0; let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ProviderError("limit", "Input or response is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function readBoundedJson(input: Request | Response, maxBytes = 262_144): Promise<unknown> {
  const length = Number(input.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new ProviderError("limit", "Input or response is too large.");
  const text = await boundedText(input.body, maxBytes);
  try { return JSON.parse(text); } catch { throw new ProviderError("invalid-input", "Invalid JSON input or response."); }
}

/** FR-006/SEC-001: pagination may continue only the current, approved GET collection. */
export function nextCanvasPage(header: string | null, currentUrl: string, baseUrl: string): string | null {
  if (!header) return null;
  const matches = [...header.matchAll(/<([^>]+)>\s*;\s*rel\s*=\s*["']?([^"',;\s]+)["']?/g)];
  const next = matches.find((match) => match[2] === "next");
  if (!next) return null;
  let url: URL;
  try { url = new URL(next[1]); } catch { throw new ProviderError("invalid-response", "Canvas returned an invalid pagination link."); }
  const current = new URL(currentUrl);
  if (url.origin !== baseUrl || url.username || url.password || url.hash || url.pathname !== current.pathname || url.searchParams.has("access_token")) {
    throw new ProviderError("invalid-response", "Canvas returned an unsafe pagination link.");
  }
  for (const key of ["enrollment_state", "enrollment_type", "include[]"]) {
    if (current.searchParams.getAll(key).join(",") !== url.searchParams.getAll(key).join(",")) throw new ProviderError("invalid-response", "Canvas pagination changed the allowed data selection.");
  }
  return url.href;
}
