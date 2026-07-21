const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export function formatRupiah(value: number): string {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

/** Numeric time parts in the product timezone, regardless of device locale. */
export function jakartaTimeParts(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { hour: read("hour"), minute: read("minute") };
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDayDate(date: Date): { day: string; full: string } {
  const day = date.toLocaleDateString("id-ID", { weekday: "long", timeZone: JAKARTA_TIME_ZONE });
  const full = date.toLocaleDateString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { day, full };
}

export function getGreeting(date: Date): { text: string; iconKey: "sunrise" | "sun" | "sunset" | "moon" } {
  const { hour } = jakartaTimeParts(date);
  if (hour >= 4 && hour < 11) return { text: "Selamat pagi", iconKey: "sunrise" };
  if (hour >= 11 && hour < 15) return { text: "Selamat siang", iconKey: "sun" };
  if (hour >= 15 && hour < 18) return { text: "Selamat sore", iconKey: "sunset" };
  return { text: "Selamat malam", iconKey: "moon" };
}
