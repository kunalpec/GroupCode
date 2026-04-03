import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

function CreateRoomDialog({ open, onOpenChange, onSubmit, loading, inviteLink }) {
  const [roomName, setRoomName] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await onSubmit(roomName);
    if (ok) {
      setRoomName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a room</DialogTitle>
          <DialogDescription>
            Spin up a shareable workspace and send the invite link to collaborators.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="MERN bug bash"
          />
          <Button className="w-full" disabled={loading || !roomName.trim()} type="submit">
            {loading ? "Creating..." : "Create room"}
          </Button>
        </form>

        {inviteLink ? (
          <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">Invite Link</p>
            <p className="mt-2 break-all text-sm text-slate-100">{inviteLink}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default CreateRoomDialog;
