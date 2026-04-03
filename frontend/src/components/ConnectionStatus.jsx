import { cn } from "../lib/utils";

function ConnectionStatus({ status }) {
  const styles = {
    connected: "bg-emerald-400",
    connecting: "bg-amber-400",
    disconnected: "bg-rose-400",
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-xs text-[#cccccc]">
      <span className={cn("h-2.5 w-2.5 rounded-full", styles[status] || styles.disconnected)} />
      <span className="capitalize">{status}</span>
    </div>
  );
}

export default ConnectionStatus;
