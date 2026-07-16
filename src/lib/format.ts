export function formatRupiah(value: number): string {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDayDate(date: Date): { day: string; full: string } {
  const day = date.toLocaleDateString("id-ID", { weekday: "long" });
  const full = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { day, full };
}

export function getGreeting(date: Date): { text: string; iconKey: "sunrise" | "sun" | "sunset" | "moon" } {
  const h = date.getHours();
  if (h >= 4 && h < 11) return { text: "Selamat pagi", iconKey: "sunrise" };
  if (h >= 11 && h < 15) return { text: "Selamat siang", iconKey: "sun" };
  if (h >= 15 && h < 18) return { text: "Selamat sore", iconKey: "sunset" };
  return { text: "Selamat malam", iconKey: "moon" };
}
