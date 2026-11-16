import { canvasRecord as record, canvasSourceId as sourceId, canvasLabel as label, normaliseCanvasSnapshot, type CanvasSnapshot } from "./canvas-data.ts";
export { normaliseCanvasSnapshot, normalizeCanvasData, type CanvasSnapshot } from "./canvas-data.ts";
import { assertCanvasBaseUrl, canvasAllowedHosts, DEFAULT_CANVAS_BASE_URL, nextCanvasPage, ProviderError, readBoundedJson, validateCredential } from "./provider-security.ts";

export type CanvasConnection = { baseUrl: string; accessToken: string; action: "verify" | "sync" };
export type CanvasResult = CanvasSnapshot & { profile: { displayName: string; workspaceId: string } };

/** ADR-002/FR-006: manual tokens are self-testing only; multi-user production requires OAuth. */
export function isPersonalTokenTestingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.CANVAS_PERSONAL_TOKEN_TESTING === "true";
}

/** FR-006/SEC-001: all Canvas requests are current-user GETs; tokens never leave this call. */
export async function syncCanvas(input: CanvasConnection, dependencies: { fetch?: typeof fetch; env?: Record<string, string | undefined> } = {}): Promise<CanvasResult> {
  const env = dependencies.env ?? process.env;
  const baseUrl = assertCanvasBaseUrl(input.baseUrl || DEFAULT_CANVAS_BASE_URL, canvasAllowedHosts(env.CANVAS_ALLOWED_HOSTS));
  const accessToken = validateCredential(input.accessToken);
  if (!["verify", "sync"].includes(input.action)) throw new ProviderError("invalid-input", "Select a valid Canvas action.");
  const requestFetch = dependencies.fetch ?? fetch;
  const signal = AbortSignal.timeout(25_000);
  let requests = 0;
  async function get(url: string) {
    requests += 1;
    if (requests > 50) throw new ProviderError("limit", "Canvas sync reached its request limit. Import a smaller selection.");
    let response: Response;
    try { response = await requestFetch(url, { method: "GET", redirect: "manual", cache: "no-store", headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "User-Agent": "StudyPilot/0.2" }, signal }); }
    catch (error) { throw new ProviderError(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "unavailable", "Canvas could not be reached. Check the connection and try again."); }
    if (!response.ok) {
      if (response.status >= 300 && response.status < 400) throw new ProviderError("unavailable", "Canvas returned a redirect. The connection was stopped to protect your token.");
      if ([401, 403].includes(response.status)) throw new ProviderError("unauthorised", "Canvas did not authorise this request. Check the token, expiry and course permissions.");
      if (response.status === 429) throw new ProviderError("rate-limited", "Canvas is rate limiting requests. Wait before trying again.");
      throw new ProviderError("unavailable", "Canvas is temporarily unavailable.");
    }
    return response;
  }
  async function collection(path: string): Promise<unknown[]> {
    const result: unknown[] = []; let url: string | null = `${baseUrl}${path}`; const seen = new Set<string>(); let pages = 0;
    while (url) {
      if (seen.has(url) || pages >= 5) throw new ProviderError("limit", "Canvas returned too many or repeated pages. No partial import was applied.");
      seen.add(url); pages += 1;
      const response = await get(url);
      const value = await readBoundedJson(response, 1_048_576);
      if (!Array.isArray(value)) throw new ProviderError("invalid-response", "Canvas returned an invalid list.");
      result.push(...value);
      if (result.length > 1000) throw new ProviderError("limit", "Canvas returned too many items. No partial import was applied.");
      url = nextCanvasPage(response.headers.get("link"), url, baseUrl);
    }
    return result;
  }
  const self = record(await readBoundedJson(await get(`${baseUrl}/api/v1/users/self`), 65_536));
  const userId = sourceId(self.id);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${baseUrl}:${userId}`));
  const profile = { displayName: label(self.name, 80, "Canvas student"), workspaceId: [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("") };
  if (input.action === "verify") return { profile, courses: [], assignments: [], warnings: [] };
  const courses = await collection("/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100");
  if (courses.length > 20) throw new ProviderError("limit", "This self-testing connection supports at most 20 current courses. No partial import was applied.");
  const assignments: unknown[] = [];
  for (const entry of courses) {
    const course = record(entry); const id = sourceId(course.id);
    const values = await collection(`/api/v1/courses/${id}/assignments?include%5B%5D=submission&per_page=100`);
    for (const item of values) {
      const assignment = record(item);
      if (assignment.course_id !== undefined && sourceId(assignment.course_id) !== id) throw new ProviderError("invalid-response", "Canvas returned an assignment for an unexpected course.");
      assignments.push({ ...assignment, course_id: id });
    }
    if (assignments.length > 500) throw new ProviderError("limit", "This self-testing connection supports at most 500 assignments. No partial import was applied.");
  }
  return { profile, ...normaliseCanvasSnapshot({ courses, assignments }) };
}
