import { isPersonalTokenTestingEnabled, syncCanvas, type CanvasConnection } from "../../../lib/canvas.ts";
import { assertSameOrigin, canvasAllowedHosts, DEFAULT_CANVAS_BASE_URL, PRIVATE_RESPONSE_HEADERS, ProviderError, readBoundedJson } from "../../../lib/provider-security.ts";

/** ADR-002 · FR-006: self-testing is explicit; production multi-user access requires approved OAuth. */
export async function GET() {
  return Response.json({ tokenTestingEnabled: isPersonalTokenTestingEnabled(), defaultBaseUrl: DEFAULT_CANVAS_BASE_URL, allowedHosts: canvasAllowedHosts(process.env.CANVAS_ALLOWED_HOSTS) }, { headers: PRIVATE_RESPONSE_HEADERS });
}

export async function POST(request: Request) {
  if (!isPersonalTokenTestingEnabled()) return Response.json({ error: "Personal-token self-testing is disabled on this server. Multi-user Canvas access requires an approved OAuth integration." }, { status: 503, headers: PRIVATE_RESPONSE_HEADERS });
  try {
    assertSameOrigin(request);
    const body = await readBoundedJson(request, 16_384);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProviderError("invalid-input", "Enter valid Canvas connection details.");
    const value = body as Record<string, unknown>;
    if (typeof value.baseUrl !== "string" || typeof value.accessToken !== "string" || !["verify", "sync"].includes(String(value.action))) throw new ProviderError("invalid-input", "Enter valid Canvas connection details.");
    const result = await syncCanvas(value as CanvasConnection);
    return Response.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : "unavailable";
    const status = code === "invalid-input" ? 400 : code === "unauthorised" ? 401 : code === "rate-limited" ? 429 : code === "timeout" ? 504 : 502;
    const message = error instanceof ProviderError ? error.message : "Canvas sync could not be completed. No changes were applied.";
    return Response.json({ error: message, code }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
