import { useEffect, useState } from "react";

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const onOffline = () => { setOnline(false); setShowRecovered(false); };
    const onOnline = () => {
      setOnline(true);
      setShowRecovered(true);
      window.setTimeout(() => setShowRecovered(false), 3000);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (online && !showRecovered) return null;
  return <div role="status" aria-live="polite" className={`fixed inset-x-0 top-0 z-[110] px-4 py-2 text-center text-xs font-semibold ${online ? "bg-emerald-500 text-zinc-900" : "bg-amber-400 text-zinc-900"}`}>
    {online ? "Koneksi kembali. DUIT dapat menyinkronkan data lagi." : "Kamu sedang offline. Perubahan baru belum dapat disimpan ke cloud."}
  </div>;
}
