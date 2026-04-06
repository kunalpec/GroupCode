import { Check, Copy, FolderKanban, Link2, MonitorSmartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

function CreateRoomDialog({ open, onOpenChange, onSubmit, loading, inviteLink }) {
  const [roomName, setRoomName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await onSubmit(roomName);
    if (ok) {
      setRoomName("");
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,38rem)] rounded-lg border border-[#454545] bg-[#252526] p-0 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-[#333333] bg-[#2d2d30] px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#858585]">Explorer</p>
        </div>

        <div className="p-5">
          <DialogHeader className="mb-5 space-y-2">
            <DialogTitle className="text-[1.65rem] font-semibold text-[#f3f3f3]">Create a room</DialogTitle>
            <DialogDescription>
              Create a shared workspace, let the backend prepare its folder, and send the invite link to collaborators.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-5 grid gap-3 rounded-md border border-[#333333] bg-[#1e1e1e] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#3794ff]">Backend to Frontend Flow</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-[#333333] bg-[#252526] p-3">
                <MonitorSmartphone className="h-4 w-4 text-[#3794ff]" />
                <p className="mt-3 text-sm font-medium text-[#f3f3f3]">1. Frontend request</p>
                <p className="mt-1 text-xs leading-5 text-[#9da1a6]">Redux sends your room name to `/api/room/create`.</p>
              </div>
              <div className="rounded-md border border-[#333333] bg-[#252526] p-3">
                <FolderKanban className="h-4 w-4 text-[#4ec9b0]" />
                <p className="mt-3 text-sm font-medium text-[#f3f3f3]">2. Backend workspace</p>
                <p className="mt-1 text-xs leading-5 text-[#9da1a6]">Server creates `room_n` in the Docker container and stores the room.</p>
              </div>
              <div className="rounded-md border border-[#333333] bg-[#252526] p-3">
                <Link2 className="h-4 w-4 text-[#d7ba7d]" />
                <p className="mt-3 text-sm font-medium text-[#f3f3f3]">3. Invite returned</p>
                <p className="mt-1 text-xs leading-5 text-[#9da1a6]">Frontend receives the invite token and shows a shareable room link.</p>
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[#858585]">Room Name</span>
              <Input
                className="h-12 rounded-md border-[#3c3c3c] bg-[#1f1f1f] text-[#cccccc] placeholder:text-[#6a6a6a] focus:border-[#007acc] focus:ring-[#007acc]/20"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="MERN bug bash"
              />
            </label>
            <Button
              className="h-11 w-full rounded-md border-[#0e639c] bg-[#0e639c] text-[15px] font-semibold text-white hover:border-[#1177bb] hover:bg-[#1177bb]"
              disabled={loading || !roomName.trim()}
              type="submit"
            >
              {loading ? "Creating..." : "Create room"}
            </Button>
          </form>

          {inviteLink ? (
            <div className="mt-5 rounded-md border border-[#333333] bg-[#1e1e1e] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#4ec9b0]">Invite Link</p>
                  <p className="mt-1 text-xs text-[#9da1a6]">Share this link so others can request access to the room.</p>
                </div>
                <Button className="gap-2 rounded-md" onClick={handleCopyInvite} type="button" variant="secondary">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-3 rounded-md border border-[#3c3c3c] bg-[#252526] px-3 py-3">
                <p className="break-all font-mono text-sm text-[#d4d4d4]">{inviteLink}</p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateRoomDialog;
