import { cn } from "../lib/utils";

function ConnectionStatus({ status }) {
  const styles = {
    connected: "bg-emerald-400",
    connecting: "bg-amber-400",
    disconnected: "bg-rose-400",
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
      <span className={cn("h-2.5 w-2.5 rounded-full", styles[status] || styles.disconnected)} />
      <span className="capitalize">{status}</span>
    </div>
  );
}

export default ConnectionStatus;
