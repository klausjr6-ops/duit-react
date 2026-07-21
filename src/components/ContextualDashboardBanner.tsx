import { jakartaTimeParts } from "../lib/format";
import { dateKeyInJakarta } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

interface Props {
  now: Date;
  scheduleCount: number;
  inMonth: number;
  outMonth: number;
  onAction: () => void;
}

export default function ContextualDashboardBanner({ now, scheduleCount, inMonth, outMonth, onAction }: Props) {
  const { isDark } = useTheme();
  const { hour } = jakartaTimeParts(now);
  const day = Number(dateKeyInJakarta(now).slice(-2));
  const monthEnd = day >= 28;
  const overspend = outMonth > inMonth;

  let eyebrow = "KONTEKS HARI INI";
  let title = "Mulai pelan, tetap punya arah.";
  let detail = scheduleCount > 0
    ? `Ada ${scheduleCount} agenda hari ini. Pilih satu hal paling penting untuk dimulai.`
    : "Tidak ada agenda mendesak. Gunakan ruang hari ini sesuai ritmemu.";
  let action = "Lihat agenda";

  if (monthEnd) {
    eyebrow = "MENJELANG AKHIR BULAN";
    title = overspend ? "Mari tutup bulan dengan lebih sadar." : "Kamu masih punya ruang untuk menutup bulan dengan tenang.";
    detail = overspend
      ? "Pengeluaran bulan ini sudah melewati pemasukan. Lihat ringkasan sebelum menambah pengeluaran baru."
      : "Lihat arus kas dan siapkan hal kecil untuk bulan berikutnya.";
    action = "Lihat ringkasan";
  } else if (hour >= 18 || hour < 4) {
    eyebrow = "PENUTUP HARI";
    title = "Hari ini sudah cukup.";
    detail = "Tidak semua harus selesai malam ini. Ambil satu menit untuk melihat hari yang sudah kamu jalani.";
    action = "Check-in malam";
  } else if (hour >= 12) {
    eyebrow = "KONTEKS SIANGMU";
    title = "Kamu sudah melewati setengah hari.";
    detail = scheduleCount > 0
      ? `Masih ada ${scheduleCount} agenda yang perlu diperhatikan hari ini.`
      : "Lihat transaksi hari ini sebelum memasuki sore.";
    action = "Lihat hari ini";
  }

  return (
    <section className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 ${
      isDark
        ? "border-teal-300/15 bg-gradient-to-br from-teal-500/20 via-slate-900 to-blue-500/15"
        : "border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50"
    }`}>
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-teal-400/15 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className={`text-[10px] font-extrabold tracking-[0.16em] ${isDark ? "text-teal-300" : "text-teal-700"}`}>{eyebrow}</p>
          <h2 className={`mt-2 text-xl font-extrabold tracking-tight sm:text-2xl ${isDark ? "text-white" : "text-zinc-900"}`}>{title}</h2>
          <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-zinc-600"}`}>{detail}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-transform hover:scale-[1.02] ${
            isDark ? "bg-teal-300 text-slate-950" : "bg-teal-600 text-white shadow-sm"
          }`}
        >
          {action} →
        </button>
      </div>
    </section>
  );
}
