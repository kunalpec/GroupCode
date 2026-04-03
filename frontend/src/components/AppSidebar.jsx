import { FolderKanban, LogOut, PlusSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";

function AppSidebar({ user, onCreateRoom, onLogout }) {
  const location = useLocation();

  return (
    <aside className="flex h-full w-full max-w-72 flex-col border-r border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="border-b border-slate-800 px-5 py-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Online VS Code</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Control Deck</h1>
        <p className="mt-2 text-sm text-slate-400">
          Launch rooms, approve collaborators, and keep your container ready.
        </p>
      </div>

      <div className="flex-1 space-y-3 px-4 py-5">
        <Button className="w-full justify-start gap-2" onClick={onCreateRoom}>
          <PlusSquare className="h-4 w-4" />
          New room
        </Button>

        <Link
          to="/dashboard"
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
            location.pathname === "/dashboard"
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      <div className="border-t border-slate-800 px-4 py-5">
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <UserAvatar
            className="mb-3 h-12 w-12 rounded-2xl border border-slate-700"
            fallbackClassName="bg-slate-800 text-sm text-slate-100"
            user={user}
          />
          <p className="text-sm font-semibold text-slate-100">{user?.name}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{user?.email}</p>
        </div>
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

export default AppSidebar;
