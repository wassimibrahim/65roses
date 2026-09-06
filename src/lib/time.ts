// event times are stored UTC and rendered in the event's timezone — never the browser's
const CITY_TZ: Record<string, string> = {
  BEIRUT: "Asia/Beirut",
  MADRID: "Europe/Madrid",
};

export function timezoneForCity(city: string): string {
  return CITY_TZ[city] ?? "Asia/Beirut";
}

function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - at.getTime();
}

// "2026-09-05" + "00:00" in Asia/Beirut → the UTC instant of that local wall time
export function utcFromZoned(dateISO: string, timeHHMM: string, timeZone: string): Date {
  const naive = new Date(`${dateISO}T${timeHHMM}:00Z`);
  const guess = new Date(naive.getTime() - offsetMs(naive, timeZone));
  // one refinement handles DST boundaries
  return new Date(naive.getTime() - offsetMs(guess, timeZone));
}
