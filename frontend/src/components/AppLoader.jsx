function AppLoader({ label = "Loading workspace..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-8 py-10 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
        <p className="text-sm text-slate-300">{label}</p>
      </div>
    </div>
  );
}

export default AppLoader;
