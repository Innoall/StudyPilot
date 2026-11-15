import { parseAppData } from "../../../lib/data.ts";
import { generateStudyPlan, type AiConfig } from "../../../lib/ai.ts";
import { assertSameOrigin, PRIVATE_RESPONSE_HEADERS, ProviderError, readBoundedJson } from "../../../lib/provider-security.ts";

/** ADR-002 · FR-005/SEC-001: supplied keys are consumed only in this request. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readBoundedJson(request);
    const data = parseAppData(body);
    const options = (body as Record<string, unknown>).ai;
    if (options !== undefined && (!options || typeof options !== "object" || Array.isArray(options))) throw new Error("Invalid AI options");
    const ai = options as AiConfig | undefined;
    if (ai && !["rules", "personal", "server"].includes(ai.mode)) throw new Error("Invalid AI mode");
    const result = await generateStudyPlan(data, ai || { mode: "rules" });
    return Response.json(result, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    return Response.json({ error: error instanceof ProviderError && error.code === "limit" ? "Planner input is too large." : "Invalid planner input or AI configuration. Check the fields and try again." }, { status: error instanceof ProviderError && error.code === "limit" ? 413 : 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
}

/** SEC-001: configuration readiness is public; configuration values and keys are not. */
export async function GET() {
  const serverConfigured = !!(process.env.SCHOOL_AI_BASE_URL && process.env.SCHOOL_AI_MODEL && process.env.SCHOOL_AI_API_KEY);
  return Response.json({ serverConfigured, personalProviders: ["cityu", "openai", "deepseek"] }, { headers: PRIVATE_RESPONSE_HEADERS });
}
