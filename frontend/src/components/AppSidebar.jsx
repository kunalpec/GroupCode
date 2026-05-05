import { FolderKanban, LogOut, PanelLeft, PanelLeftClose, PlusSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";

function AppSidebar({ user, onCreateRoom, onLogout, isOpen, onToggleSidebar }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-screen overflow-hidden border-r border-[#333333] bg-[#202124] transition-all duration-300",
        isOpen ? "w-full max-w-72" : "w-16 max-w-16",
      )}
    >
      <div className={cn("flex h-full flex-col", isOpen ? "w-72" : "w-16")}>
        <div className={cn("border-b border-[#333333]", isOpen ? "px-5 py-5" : "px-2 py-4")}>
          <div className={cn("flex", isOpen ? "items-start justify-between gap-3" : "justify-center")}>
            {isOpen ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ab4f8]">Online VS Code</p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-white">Workbench</h1>
              </div>
            ) : null}
            <Button
              className="h-11 w-11 rounded-none border border-[#333333] bg-[#252526] p-0 text-white hover:bg-[#2d2f31]"
              onClick={onToggleSidebar}
              type="button"
              variant="ghost"
            >
              {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isOpen ? (
          <>
            <div className="border-b border-[#333333] px-3 py-4">
              <Button className="h-11 w-full justify-start gap-2 rounded-none bg-[#1a73e8] hover:bg-[#2b7de9]" onClick={onCreateRoom}>
                <PlusSquare className="h-4 w-4" />
                New room
              </Button>
            </div>

            <div className="px-3 py-3">
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 rounded-none border px-3 py-2.5 text-sm transition ${
                  location.pathname === "/dashboard"
                    ? "border-[#2f5f9c] bg-[#1f3b57] text-white"
                    : "border-transparent text-[#bdc1c6] hover:border-[#333333] hover:bg-[#2a2d2e] hover:text-white"
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                Dashboard
              </Link>
            </div>

            <div className="flex-1" />

            <div className="border-t border-[#333333] px-3 py-4">
              <div className="mb-3 border border-[#333333] bg-[#2a2c2f] p-4">
                <UserAvatar
                  className="mb-3 h-12 w-12 rounded-none"
                  fallbackClassName="bg-[#3c3c3c] text-sm text-white"
                  user={user}
                />
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="mt-1 truncate text-xs text-[#9da1a6]">{user?.email}</p>
              </div>
              <Button variant="secondary" className="h-11 w-full justify-start gap-2 rounded-none" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-between py-4">
            <Link
              to="/dashboard"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-none border transition",
                location.pathname === "/dashboard"
                  ? "border-[#2f5f9c] bg-[#1f3b57] text-white"
                  : "border-transparent text-[#bdc1c6] hover:border-[#333333] hover:bg-[#2a2d2e] hover:text-white",
              )}
            >
              <FolderKanban className="h-4 w-4" />
            </Link>
            <UserAvatar
              className="h-10 w-10 rounded-none"
              fallbackClassName="bg-[#3c3c3c] text-xs text-white"
              user={user}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

export default AppSidebar;
