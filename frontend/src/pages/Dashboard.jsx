import {
  Check,
  ChevronDown,
  Copy,
  Cpu,
  ExternalLink,
  Inbox,
  Mail,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
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
import { cn } from "../lib/utils";
import { toast } from "../hooks/use-toast";
import { getMe, logout } from "../redux/slices/authSlice";
import {
  createContainer,
  fetchContainerInfo,
  fetchContainerStatus,
} from "../redux/slices/containerSlice";
import { createRoom, deleteRoom, getRooms } from "../redux/slices/roomSlice";
import { api } from "../services/api";

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const {
    initialized,
    loading: containerLoading,
    services,
    status: containerStatus,
    statusLoading,
    lastSyncedAt,
  } = useSelector((state) => state.container);
  const { rooms, inviteLink, loading } = useSelector((state) => state.room);
  const { status } = useSelector((state) => state.socket);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [joinLink, setJoinLink] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedInviteToken, setSelectedInviteToken] = useState("");
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [actingInviteId, setActingInviteId] = useState("");
  const [removingInviteId, setRemovingInviteId] = useState("");

  const ownedRooms = rooms.filter((room) => String(room.owner) === String(user?._id));

  useEffect(() => {
    dispatch(getRooms());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedInviteToken && ownedRooms.length > 0) {
      setSelectedInviteToken(ownedRooms[0].inviteToken);
    }
  }, [ownedRooms, selectedInviteToken]);

  useEffect(() => {
    const fetchMyInvites = async () => {
      try {
        setInvitesLoading(true);
        const response = await api.get("/api/invite/my-invites");
        setIncomingInvites(response?.data?.data?.invites || []);
      } catch {
        setIncomingInvites([]);
      } finally {
        setInvitesLoading(false);
      }
    };

    fetchMyInvites();
  }, []);

  useEffect(() => {
    if (!user?.containerId && !initialized) {
      dispatch(createContainer()).catch(() => null);
    }
  }, [dispatch, initialized, user?.containerId]);

  useEffect(() => {
    if (user?.containerId) {
      dispatch(fetchContainerInfo()).catch(() => null);
      dispatch(fetchContainerStatus()).catch(() => null);
    }
  }, [dispatch, user?.containerId]);

  useEffect(() => {
    if (!user?.containerId) return undefined;

    const intervalId = window.setInterval(() => {
      dispatch(fetchContainerInfo()).catch(() => null);
      dispatch(fetchContainerStatus()).catch(() => null);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [dispatch, user?.containerId]);

  const handleCreateRoom = async (roomName) => {
    try {
      await dispatch(createRoom({ roomName })).unwrap();
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
      toast({
        title: "Invalid invite",
        description: "Paste a valid room invite link or token.",
        variant: "destructive",
      });
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

  const handleSendInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!selectedInviteToken || !normalizedEmail) {
      toast({
        title: "Invite details missing",
        description: "Choose a room and enter an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingInvite(true);
      await api.post("/api/invite/send-invite", {
        inviteToken: selectedInviteToken,
        email: normalizedEmail,
      });
      setInviteEmail("");
    } catch (error) {
      toast({
        title: "Invite failed",
        description: error?.response?.data?.message || "Could not send invite email.",
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      setActingInviteId(inviteId);
      const response = await api.post("/api/invite/action", { inviteId, action });
      const updatedInvite = response?.data?.data?.invite;

      setIncomingInvites((current) =>
        current.map((invite) =>
          invite._id === inviteId ? { ...invite, ...(updatedInvite || {}), status: action } : invite,
        ),
      );

      if (action === "accepted") {
        await dispatch(getRooms());
      }
    } catch (error) {
      toast({
        title: "Invite update failed",
        description: error?.response?.data?.message || "Could not update invite.",
        variant: "destructive",
      });
    } finally {
      setActingInviteId("");
    }
  };

  const handleRemoveInvite = async (inviteId) => {
    try {
      setRemovingInviteId(inviteId);
      await api.delete(`/api/invite/${inviteId}`);
      setIncomingInvites((current) => current.filter((invite) => invite._id !== inviteId));
    } catch (error) {
      toast({
        title: "Invite remove failed",
        description: error?.response?.data?.message || "Could not remove invite history.",
        variant: "destructive",
      });
    } finally {
      setRemovingInviteId("");
    }
  };

  const latestOwnedInviteLink = ownedRooms[0]?.inviteToken
    ? `${window.location.origin}/join/${ownedRooms[0].inviteToken}`
    : inviteLink;

  const serviceOrder = ["react", "python", "backend", "socket", "next"];
  const serviceEntries = serviceOrder
    .map((key) => [key, services?.[key]])
    .filter(([, service]) => Boolean(service));

  const normalizedContainerStatus = containerStatus?.toLowerCase?.() || "unknown";
  const isContainerLive = normalizedContainerStatus === "running";
  const syncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const handleCopyUrl = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy this URL.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid h-screen overflow-hidden bg-[#1f1f1f]" style={{ gridTemplateColumns: isSidebarOpen ? "18rem 1fr" : "4rem 1fr" }}>
      <AppSidebar
        isOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
        user={user}
        onCreateRoom={() => setIsCreateOpen(true)}
        onLogout={handleLogout}
      />

      <main className="scrollbar-thin overflow-y-auto px-6 py-6 sm:px-10">
        <div className="mb-8 flex items-center justify-between border-b border-[#333333] pb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ab4f8]">Workspace</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">Welcome back, {user?.name}</h2>
          </div>
          <ConnectionStatus status={status} />
        </div>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="border border-[#333333] bg-[#252526] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#4ec9b0]" />
              <h3 className="font-semibold text-white">Rooms</h3>
            </div>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-white">{rooms.length}</p>
            <p className="mt-2 text-sm text-[#9da1a6]">Active workspaces</p>
          </div>
          <div className="border border-[#333333] bg-[#252526] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <h3 className="text-lg font-semibold text-white">Join Rooms</h3>
            <div className="mt-4 flex gap-3">
              <Input
                className="h-14 rounded-none"
                onChange={(event) => setJoinLink(event.target.value)}
                placeholder="http://localhost:5173/join/your-invite-token"
                value={joinLink}
              />
              <Button className="h-14 rounded-none bg-[#1a73e8] px-8 hover:bg-[#2b7de9]" onClick={handleJoinRoom}>
                Join
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Rooms Cards</h3>
          </div>
          <div className="max-h-[28rem] overflow-y-auto border border-[#333333] bg-[#252526] p-4">
            <RoomGrid
              currentUserId={user?._id}
              deletingRoomId={deletingRoomId}
              onDeleteRoom={handleDeleteRoom}
              rooms={rooms}
            />
          </div>
        </section>

        <section className="mt-5">
          <div className="border border-[#333333] bg-[#252526] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-[#3794ff]" />
              <h3 className="font-semibold text-white">Docker Ports Config</h3>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
                  isContainerLive
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-[#444] bg-[#252525] text-[#9da1a6]",
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    isContainerLive ? "bg-amber-300" : "bg-[#6b7280]",
                  )}
                />
                {normalizedContainerStatus}
              </div>
              <div className="inline-flex items-center gap-2 border border-[#333333] bg-[#1f1f1f] px-3 py-1 text-xs text-[#9da1a6]">
                <RefreshCw className={cn("h-3.5 w-3.5", statusLoading && "animate-spin")} />
                {syncLabel ? `Synced ${syncLabel}` : "Waiting for first sync"}
              </div>
            </div>
            {serviceEntries.length > 0 ? (
              <div className="mt-4 border border-[#333333] bg-[#1f1f1f] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#4ec9b0]">User ports</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {serviceEntries.map(([key, service]) => (
                    <div key={key} className="border border-[#333333] bg-[#252526] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{service.label}</p>
                          <p className="mt-1 text-xs text-[#9da1a6]">
                            Host port {service.hostPort} to container port {service.containerPort}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="border border-[#3c3c3c] p-2 text-[#cccccc] transition hover:border-[#4ec9b0] hover:text-white"
                            onClick={() => handleCopyUrl(service.url)}
                            type="button"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <a
                            className={cn(
                              "border border-[#3c3c3c] p-2 text-[#cccccc] transition hover:border-[#3794ff] hover:text-white",
                              !isContainerLive && "pointer-events-none opacity-50",
                            )}
                            href={service.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border border-[#333333] bg-[#202224] px-3 py-2">
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[#9da1a6]">Port</span>
                        <span className="font-mono text-sm text-[#4ec9b0]">{service.hostPort}</span>
                      </div>
                      <p className="mt-3 break-all bg-[#1e1e1e] px-3 py-2 font-mono text-xs text-[#dcdcaa]">
                        {service.url}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 border border-dashed border-[#333333] bg-[#1f1f1f] p-3 text-sm text-[#9da1a6]">
                {containerLoading ? "Loading route mappings..." : "No routes available yet."}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="border border-[#333333] bg-[#252526] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#d7ba7d]" />
              <h3 className="font-semibold text-white">Invite Card</h3>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="relative">
                <select
                  className="h-11 w-full appearance-none border border-[#3c3c3c] bg-[#1f1f1f] px-3 pr-12 text-sm text-white outline-none"
                  onChange={(event) => setSelectedInviteToken(event.target.value)}
                  value={selectedInviteToken}
                >
                  <option value="">Select your room</option>
                  {ownedRooms.map((room) => (
                    <option key={room._id} value={room.inviteToken}>
                      {room.roomName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9da1a6]" />
              </div>
              <Input
                className="rounded-none"
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="collaborator@email.com"
                type="email"
                value={inviteEmail}
              />
              <Button
                className="h-11 rounded-none bg-[#1a73e8] hover:bg-[#2b7de9]"
                disabled={sendingInvite || !ownedRooms.length}
                onClick={handleSendInvite}
              >
                {sendingInvite ? "Sending..." : "Send invite"}
              </Button>
            </div>
            {latestOwnedInviteLink ? (
              <p className="mt-4 truncate text-xs text-[#9da1a6]">{latestOwnedInviteLink}</p>
            ) : null}
          </div>

          <div className="border border-[#333333] bg-[#252526] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <h3 className="text-lg font-semibold text-white">Profile</h3>
            <div className="mt-5 flex items-center gap-4">
              <UserAvatar
                className="h-20 w-20 rounded-full border-2 border-[#3c3c3c] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                fallbackClassName="bg-[#3c3c3c] text-lg text-white"
                user={user}
              />
              <div className="flex-1">
                <p className="font-semibold text-white">{user?.name}</p>
                <p className="text-sm text-[#9da1a6]">{user?.email}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border border-[#3c3c3c] bg-[#2d2d30] px-4 py-3 text-sm text-[#cccccc] hover:bg-[#37373d] hover:text-white">
                  <UploadCloud className="h-4 w-4" />
                  {avatarUploading ? "Uploading..." : "Change photo"}
                  <input
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={handleAvatarUpload}
                    type="file"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="border border-[#333333] bg-[#252526] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-[#4ec9b0]" />
              <h3 className="text-lg font-semibold text-white">Incoming Invites</h3>
            </div>
            <div className="mt-4 max-h-[20rem] overflow-y-auto border border-[#333333] bg-[#1f1f1f] p-3">
              <div className="space-y-3">
              {incomingInvites.length ? (
                incomingInvites.map((invite) => {
                  const isPending = invite.status === "pending";
                  const inviteLinkValue = invite?.room_id?.inviteToken
                    ? `${window.location.origin}/join/${invite.room_id.inviteToken}`
                    : "";

                  return (
                    <div key={invite._id} className="relative border border-[#333333] bg-[#252526] p-4">
                      <button
                        className="absolute right-4 top-4 border border-[#3c3c3c] p-2 text-[#9da1a6] transition hover:border-[#f48771] hover:text-[#f48771]"
                        disabled={removingInviteId === invite._id}
                        onClick={() => handleRemoveInvite(invite._id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pr-14">
                          <p className="truncate font-medium text-white">
                            {invite?.room_id?.roomName || "Shared room"}
                          </p>
                          <p className="mt-1 text-xs text-[#9da1a6]">
                            From {invite?.userown?.name || "Unknown"} • {invite?.userown?.email || "No email"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mr-14 border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]",
                            invite.status === "accepted"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : invite.status === "declined"
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                          )}
                        >
                          {invite.status}
                        </span>
                      </div>
                      {inviteLinkValue ? (
                        <p className="mt-3 break-all bg-[#181818] px-3 py-2 font-mono text-xs text-[#dcdcaa]">
                          {inviteLinkValue}
                        </p>
                      ) : null}
                      {isPending ? (
                        <div className="mt-3 flex gap-2">
                          <Button
                            className="rounded-none"
                            disabled={actingInviteId === invite._id || removingInviteId === invite._id}
                            onClick={() => handleInviteAction(invite._id, "accepted")}
                            size="sm"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            className="rounded-none"
                            disabled={actingInviteId === invite._id || removingInviteId === invite._id}
                            onClick={() => handleInviteAction(invite._id, "declined")}
                            size="sm"
                            variant="secondary"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-[#333333] bg-[#252526] p-4 text-sm text-[#9da1a6]">
                  {invitesLoading ? "Loading invites..." : "No incoming invites yet."}
                </div>
              )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <CreateRoomDialog
        inviteLink={inviteLink}
        loading={loading}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateRoom}
        open={isCreateOpen}
      />
    </div>
  );
}

export default Dashboard;
