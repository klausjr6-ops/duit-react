import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DUIT runtime render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="min-h-screen bg-[#f5f7f7] p-6 text-zinc-900 flex items-center justify-center dark:bg-slate-950 dark:text-white">
      <div className="max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 text-2xl font-black text-white">D</div>
        <h1 className="mt-4 text-xl font-extrabold">Tampilan DUIT perlu dimuat ulang</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">Terjadi gangguan tampilan sementara. Data cloud kamu tidak dihapus.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-zinc-900">Muat Ulang</button>
      </div>
    </div>;
  }
}
