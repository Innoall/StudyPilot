/** ADR-002 / FR-004: all study dates use Hong Kong time, independent of host locale. */
export const STUDY_TIME_ZONE = "Asia/Hong_Kong";
export const HONG_KONG_OFFSET_MS = 8 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

type Instant = string | number | Date;

function validInstant(value: Instant): number {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(time)) throw new RangeError("Enter a valid date and time.");
  return time;
}

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

/** FR-003/004: calendar date in the application's declared study timezone. */
export function hongKongDate(value: Instant = Date.now()): string {
  const shifted = new Date(validInstant(value) + HONG_KONG_OFFSET_MS);
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** FR-004: absolute start of the Hong Kong calendar date containing an instant. */
export function hongKongDayStart(value: Instant = Date.now()): number {
  return Date.parse(`${hongKongDate(value)}T00:00:00+08:00`);
}

/** FR-003/004: Sunday=0 through Saturday=6, without depending on the server timezone. */
export function hongKongWeekday(value: Instant = Date.now()): number {
  return new Date(validInstant(value) + HONG_KONG_OFFSET_MS).getUTCDay();
}

/** FR-002: convert a stored instant into a datetime-local input in Hong Kong time. */
export function hongKongDateTimeInput(value: Instant): string {
  const shifted = new Date(validInstant(value) + HONG_KONG_OFFSET_MS);
  return `${hongKongDate(value)}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** FR-002: reject impossible local dates instead of silently normalising February 30. */
export function parseHongKongDateTime(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new RangeError("Enter a valid Hong Kong date and time.");
  }
  const instant = Date.parse(`${value}:00+08:00`);
  if (!Number.isFinite(instant) || hongKongDateTimeInput(instant) !== value) {
    throw new RangeError("Enter a valid Hong Kong date and time.");
  }
  return new Date(instant).toISOString();
}
