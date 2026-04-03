import { FolderKanban, LogOut, PlusSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";

function AppSidebar({ user, onCreateRoom, onLogout }) {
  const location = useLocation();

  return (
    <aside className="flex h-full w-full max-w-72 flex-col border-r border-[#333333] bg-[#252526]">
      <div className="border-b border-[#333333] px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#3794ff]">Online VS Code</p>
        <h1 className="mt-2 text-[26px] font-semibold text-white">Workbench</h1>
        <p className="mt-2 text-sm text-[#9da1a6]">
          Rooms, invites, and workspace controls in one place.
        </p>
      </div>

      <div className="flex-1 space-y-2 px-3 py-4">
        <Button className="w-full justify-start gap-2 rounded-md" onClick={onCreateRoom}>
          <PlusSquare className="h-4 w-4" />
          New room
        </Button>

        <Link
          to="/dashboard"
          className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition ${
            location.pathname === "/dashboard"
              ? "border-[#094771] bg-[#094771] text-white"
              : "border-transparent text-[#9da1a6] hover:border-[#333333] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Dashboard
        </Link>
      </div>

      <div className="border-t border-[#333333] px-3 py-4">
        <div className="mb-3 rounded-md border border-[#333333] bg-[#2d2d30] p-4">
          <UserAvatar
            className="mb-3 h-11 w-11 rounded-md border border-[#3c3c3c]"
            fallbackClassName="bg-[#3c3c3c] text-sm text-white"
            user={user}
          />
          <p className="text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 truncate text-xs text-[#9da1a6]">{user?.email}</p>
        </div>
        <Button variant="secondary" className="w-full justify-start gap-2 rounded-md" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

export default AppSidebar;
