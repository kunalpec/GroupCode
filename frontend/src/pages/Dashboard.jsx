import { Cpu, Link2, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import ConnectionStatus from "../components/ConnectionStatus";
import CreateRoomDialog from "../components/CreateRoomDialog";
import RoomGrid from "../components/RoomGrid";
import UserAvatar from "../components/UserAvatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";
import { getMe, logout } from "../redux/slices/authSlice";
import { createContainer } from "../redux/slices/containerSlice";
import { createRoom, deleteRoom, getRooms } from "../redux/slices/roomSlice";
import { api } from "../services/api";

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { initialized, loading: containerLoading } = useSelector((state) => state.container);
  const { rooms, inviteLink, loading } = useSelector((state) => state.room);
  const { status } = useSelector((state) => state.socket);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState("");

  useEffect(() => {
    dispatch(getRooms());
  }, [dispatch]);

  useEffect(() => {
    if (!user?.containerId && !initialized) {
      dispatch(createContainer()).catch(() => null);
    }
  }, [dispatch, initialized, user?.containerId]);

  const handleCreateRoom = async (roomName) => {
    try {
      await dispatch(createRoom({ roomName })).unwrap();
      toast({ title: "Room created", description: "Your invite link is ready to share." });
      dispatch(getRooms());
      return true;
    } catch (error) {
      toast({ title: "Room creation failed", description: error, variant: "destructive" });
      return false;
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
  };

  const handleJoinRoom = () => {
    const trimmed = joinLink.trim();
    if (!trimmed) return;

    const token = trimmed.includes("/join/")
      ? trimmed.split("/join/").pop()?.split(/[?#]/)[0]
      : trimmed;

    if (!token) {
      toast({ title: "Invalid invite", description: "Paste a valid room invite link or token.", variant: "destructive" });
      return;
    }

    navigate(`/join/${token}`);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setAvatarUploading(true);
      await api.post("/api/users/upload-avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await dispatch(getMe()).unwrap();
      toast({ title: "Avatar updated", description: "Your new profile image is live." });
    } catch (error) {
      toast({
        title: "Avatar upload failed",
        description: error?.response?.data?.message || "Could not upload avatar.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!room?._id) return;
    if (String(room.owner) !== String(user?._id)) {
      toast({
        title: "Delete not allowed",
        description: "Only the room owner can delete this room.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(`Delete "${room.roomName}" and all its files?`);
    if (!confirmed) return;

    try {
      setDeletingRoomId(room._id);
      await dispatch(deleteRoom(room._id)).unwrap();
      toast({ title: "Room deleted", description: `${room.roomName} has been removed.` });
    } catch (error) {
      toast({
        title: "Delete room failed",
        description: error,
        variant: "destructive",
      });
    } finally {
      setDeletingRoomId("");
    }
  };

  return (
    <div className="grid min-h-screen bg-[#1e1e1e] lg:grid-cols-[18rem_1fr]">
      <AppSidebar user={user} onCreateRoom={() => setIsCreateOpen(true)} onLogout={handleLogout} />

      <main className="px-5 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-[#333333] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#3794ff]">Workspace</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Welcome back, {user?.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#9da1a6]">
              Manage rooms, invites, and container state from one workbench.
            </p>
          </div>
          <ConnectionStatus status={status} />
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-[#3794ff]" />
              <h3 className="font-semibold text-white">Container</h3>
            </div>
            <p className="mt-3 text-sm text-[#9da1a6]">
              {user?.containerId || initialized
                ? "Docker workspace is ready."
                : containerLoading
                  ? "Preparing container..."
                  : "Container will be created automatically."}
            </p>
          </div>

          <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#4ec9b0]" />
              <h3 className="font-semibold text-white">Rooms</h3>
            </div>
            <p className="mt-3 text-sm text-[#9da1a6]">{rooms.length} collaborative workspace(s)</p>
          </div>

          <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-[#d7ba7d]" />
              <h3 className="font-semibold text-white">Latest Invite</h3>
            </div>
            <p className="mt-3 truncate text-sm text-[#9da1a6]">{inviteLink || "Create a room to generate one."}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
            <h3 className="text-lg font-semibold text-white">Join Room With Link</h3>
            <p className="mt-2 text-sm text-[#9da1a6]">
              Paste a full invite URL or just the invite token and jump directly into the room.
            </p>
            <div className="mt-4 flex gap-3">
              <Input
                onChange={(event) => setJoinLink(event.target.value)}
                placeholder="http://localhost:5173/join/your-invite-token"
                value={joinLink}
              />
              <Button onClick={handleJoinRoom}>Join</Button>
            </div>
          </div>

          <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
            <h3 className="text-lg font-semibold text-white">Profile</h3>
              <div className="mt-4 flex items-center gap-4">
              <UserAvatar
                className="h-16 w-16 rounded-md border border-[#3c3c3c]"
                fallbackClassName="bg-[#3c3c3c] text-lg text-white"
                user={user}
              />
              <div className="flex-1">
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-sm text-[#9da1a6]">{user?.email}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#2d2d30] px-3 py-2 text-sm text-[#cccccc] hover:bg-[#37373d] hover:text-white">
                  <UploadCloud className="h-4 w-4" />
                  {avatarUploading ? "Uploading..." : "Set avatar"}
                  <input className="hidden" disabled={avatarUploading} onChange={handleAvatarUpload} type="file" accept="image/*" />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Your rooms</h3>
          </div>
          <RoomGrid
            currentUserId={user?._id}
            deletingRoomId={deletingRoomId}
            onDeleteRoom={handleDeleteRoom}
            rooms={rooms}
          />
        </section>
      </main>

      <CreateRoomDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateRoom}
        loading={loading}
        inviteLink={inviteLink}
      />
    </div>
  );
}

export default Dashboard;
