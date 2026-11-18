/** FR-006/009: session policy only; the UI owns timers, requests and page-memory credentials. */
export const CANVAS_SYNC_INTERVAL_MS = 5 * 60_000;

export type CanvasSyncTicket = Readonly<{ epoch: number; sequence: number }>;
export type CanvasSyncEnvironment = { automatic?: boolean; visible?: boolean; editing?: boolean };
export type CanvasSyncSnapshot = Readonly<{
  confirmed: boolean;
  automatic: boolean;
  paused: boolean;
  inFlight: boolean;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
}>;

function assertClock(now: number) {
  if (!Number.isFinite(now) || now < 0) throw new RangeError("A valid sync clock is required.");
}

/**
 * FR-006/009, PRIV-002: explicit import consent gates automatic reads, and epochs
 * invalidate late responses after disconnect, identity change or backup restore.
 * A caller must reset/abort its network request together; no data or token is held here.
 */
export class CanvasSyncSession {
  private epoch = 0;
  private sequence = 0;
  private current: CanvasSyncTicket | null = null;
  private confirmed = false;
  private automatic = false;
  private paused = false;
  private lastAttemptAt: number | null = null;
  private lastSuccessAt: number | null = null;

  get snapshot(): CanvasSyncSnapshot {
    return {
      confirmed: this.confirmed, automatic: this.automatic, paused: this.paused,
      inFlight: this.current !== null, lastAttemptAt: this.lastAttemptAt,
      lastSuccessAt: this.lastSuccessAt,
    };
  }

  /** FR-006/009: rejected ticks cannot reserve work or advance the five-minute interval. */
  canAutomaticallySync(now: number, environment: CanvasSyncEnvironment = {}): boolean {
    assertClock(now);
    return this.confirmed && this.automatic && !this.paused && this.current === null
      && environment.visible === true && environment.editing !== true
      && this.lastAttemptAt !== null && now - this.lastAttemptAt >= CANVAS_SYNC_INTERVAL_MS;
  }

  /** FR-006/009: reserve before fetching, so a timer and click cannot overlap. */
  begin(now: number, environment: CanvasSyncEnvironment = {}): CanvasSyncTicket | null {
    assertClock(now);
    if (this.current || (environment.automatic && !this.canAutomaticallySync(now, environment))) return null;
    this.current = Object.freeze({ epoch: this.epoch, sequence: ++this.sequence });
    this.lastAttemptAt = now;
    return this.current;
  }

  /** PRIV-002: consult immediately before applying a response to current study facts. */
  isCurrent(ticket: CanvasSyncTicket): boolean {
    return this.current !== null && ticket.epoch === this.epoch
      && ticket.sequence === this.current.sequence;
  }

  /** FR-006/QA-001: a successful explicit retry releases a rate/authentication pause. */
  succeed(ticket: CanvasSyncTicket, now: number): boolean {
    if (!this.isCurrent(ticket)) return false;
    assertClock(now);
    this.current = null;
    this.lastSuccessAt = now;
    this.paused = false;
    return true;
  }

  /** FR-006/QA-001: failed reads never establish import consent or a successful sync time. */
  fail(ticket: CanvasSyncTicket, httpStatus?: number): boolean {
    if (!this.isCurrent(ticket)) return false;
    this.current = null;
    if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429) this.paused = true;
    return true;
  }

  /** FR-006/009: call only from the user's import/automatic-sync confirmation action. */
  confirmImport(automatic: boolean): boolean {
    if (this.lastSuccessAt === null || this.current !== null) return false;
    this.confirmed = true;
    this.automatic = automatic;
    return true;
  }

  /** FR-009: disabling a timer does not prevent deliberate manual reads. */
  disableAutomatic(): void { this.automatic = false; }

  /** PRIV-002/SEC-001: new page/workspace sessions start without automatic authorization. */
  reset(): void {
    this.epoch += 1;
    this.current = null;
    this.confirmed = false;
    this.automatic = false;
    this.paused = false;
    this.lastAttemptAt = null;
    this.lastSuccessAt = null;
  }
}
