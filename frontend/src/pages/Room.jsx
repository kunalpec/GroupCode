import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  ChevronLeft,
  Copy,
  MessageSquareText,
  PanelBottomOpen,
  PanelLeftOpen,
  PanelRightOpen,
  TerminalSquare,
  Users,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import ConnectionStatus from "../components/ConnectionStatus";
import EditorPane from "../components/EditorPane";
import FileExplorer from "../components/FileExplorer";
import RoomApprovalDialog from "../components/RoomApprovalDialog";
import TerminalPane from "../components/TerminalPane";
import UserAvatar from "../components/UserAvatar";
import { getParentPath, joinPaths } from "../components/FileExplorer";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "../hooks/use-toast";
import { addMessage, clearTypingUser, resetChat, setMessages, setTypingUser } from "../redux/slices/chatSlice";
import { getRoomDirectory, getRooms, resetRoomWorkspace, setCurrentRoom } from "../redux/slices/roomSlice";
import { addApprovalRequest, removeApprovalRequest, setJoinState, setRoomUsers, setSocketStatus } from "../redux/slices/socketSlice";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import { getAvatarUrl } from "../lib/avatar";

function normalizeHistory(message) {
  return {
    userId: message.user?._id || message.userId,
    username: message.user?.name || message.username || "Unknown",
    avatar: getAvatarUrl(message.user) || message.avatar || "",
    userColor: message.user?.userColor || message.userColor || "#38bdf8",
    message: message.content || message.message,
    time: message.createdAt || message.time || new Date().toISOString(),
  };
}

function toRelativeWorkspacePath(roomPath, absolutePath) {
  if (!roomPath || !absolutePath) return "";
  const normalizedRoomPath = roomPath.replace(/\/+$/, "");
  if (!absolutePath.startsWith(normalizedRoomPath)) return absolutePath;
  const relativePath = absolutePath.slice(normalizedRoomPath.length);
  return relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
}

function createTerminalSession(index) {
  return {
    id: `terminal-${index}`,
    label: `Terminal ${index}`,
    buffer: "",
  };
}

function getRunCommand(filePath) {
  const normalizedPath = filePath.replace(/^\/+/, "");
  const escapedPath = normalizedPath.replace(/"/g, '\\"');
  const extension = normalizedPath.split(".").pop()?.toLowerCase();

  if (extension === "py") return `python3 "./${escapedPath}"\r`;
  if (extension === "js") return `node "./${escapedPath}"\r`;
  if (extension === "mjs") return `node "./${escapedPath}"\r`;
  if (extension === "cjs") return `node "./${escapedPath}"\r`;
  if (extension === "sh") return `bash "./${escapedPath}"\r`;
  if (extension === "bash") return `bash "./${escapedPath}"\r`;
  if (extension === "zsh") return `zsh "./${escapedPath}"\r`;

  return `chmod +x "./${escapedPath}" 2>/dev/null; "./${escapedPath}"\r`;
}

function Room() {
  const { inviteToken } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useSelector((state) => state.auth);
  const { rooms, currentRoom, entries } = useSelector((state) => state.room);
  const { status, approvalRequests, joinState, joinMessage, roomUsers } = useSelector((state) => state.socket);
  const { messages, typingUsers } = useSelector((state) => state.chat);
  const [selectedFile, setSelectedFile] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [activeTab, setActiveTab] = useState("terminal");
  const [rightPanelTab, setRightPanelTab] = useState("chat");
  const [isExplorerVisible, setIsExplorerVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState([createTerminalSession(1)]);
  const [activeTerminalId, setActiveTerminalId] = useState("terminal-1");
  const [collaborators, setCollaborators] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const syncGuardRef = useRef(false);
  const editorRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const room = useMemo(
    () => currentRoom || rooms.find((item) => item.inviteToken === inviteToken) || null,
    [currentRoom, inviteToken, rooms],
  );

  useEffect(() => {
    dispatch(getRooms());
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      dispatch(resetRoomWorkspace());
      dispatch(resetChat());
      dispatch(setJoinState({ state: "idle", message: "" }));
      dispatch(setRoomUsers([]));
      disconnectSocket();
    };
  }, [dispatch]);

  useEffect(() => {
    setSelectedFile("");
    setEditorContent("");
    setIsReady(false);
    setCollaborators([]);
    setTerminalSessions([createTerminalSession(1)]);
    setActiveTerminalId("terminal-1");
    dispatch(resetRoomWorkspace());
    dispatch(setRoomUsers([]));
  }, [dispatch, inviteToken]);

  useEffect(() => {
    if (room) {
      dispatch(setCurrentRoom(room));
      dispatch(getRoomDirectory(room._id));
    }
  }, [dispatch, room]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isToggleExplorer =
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === "b";

      if (isToggleExplorer) {
        event.preventDefault();
        setIsExplorerVisible((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const socket = connectSocket(accessToken || "");
    dispatch(setSocketStatus("connecting"));

    const joinCurrentRoom = () => {
      if (!inviteToken) return;

      socket.emit("join-room", { inviteToken }, (response) => {
        if (!response?.success) {
          dispatch(setJoinState({ state: "failed", message: response?.message || "Unable to join" }));
          return;
        }

        if (response.pending) {
          dispatch(setJoinState({ state: "pending", message: response.message }));
          return;
        }

        setIsReady(true);
        dispatch(setJoinState({ state: "approved", message: response.message || "Joined room" }));
        dispatch(setRoomUsers(response.roomUsers || []));
        socket.emit("get-messages", { limit: 50 }, (historyResponse) => {
          if (historyResponse?.success) {
            dispatch(setMessages(historyResponse.messages.map(normalizeHistory)));
          }
        });
      });
    };

    const onConnect = () => {
      dispatch(setSocketStatus("connected"));
      joinCurrentRoom();
    };
    const onDisconnect = () => dispatch(setSocketStatus("disconnected"));
    const onConnectError = () => dispatch(setSocketStatus("disconnected"));
    const onJoinRequest = (payload) => dispatch(addApprovalRequest(payload));
    const onJoinApproved = (payload) => {
      dispatch(setJoinState({ state: "approved", message: "Access granted." }));
      setIsReady(true);
      dispatch(getRooms());
      dispatch(setRoomUsers(payload?.roomUsers || []));
      socket.emit("get-messages", { limit: 50 }, (historyResponse) => {
        if (historyResponse?.success) {
          dispatch(setMessages(historyResponse.messages.map(normalizeHistory)));
        }
      });
    };
    const onJoinRejected = () => {
      dispatch(setJoinState({ state: "rejected", message: "The owner rejected your request." }));
      dispatch(setRoomUsers([]));
    };
    const onTerminalOutput = (payload) => {
      if (!payload?.terminalId) return;

      setTerminalSessions((current) => {
        const existing = current.find((session) => session.id === payload.terminalId);
        if (!existing) {
          return [
            ...current,
            {
              id: payload.terminalId,
              label: payload.terminalId.replace("-", " "),
              buffer: payload.data || "",
            },
          ];
        }

        return current.map((session) =>
          session.id === payload.terminalId
            ? { ...session, buffer: `${session.buffer}${payload.data || ""}` }
            : session,
        );
      });
    };
    const onMessage = (payload) => dispatch(addMessage(payload));
    const onTyping = (payload) => dispatch(setTypingUser(payload));
    const onStopTyping = (payload) => dispatch(clearTypingUser(payload.userId));
    const onRoomUsers = (payload) => dispatch(setRoomUsers(payload?.users || []));
    const onCursorUpdate = (payload) => {
      setCollaborators((current) => {
        const next = current.filter((entry) => entry.userId !== payload.userId);
        return [...next, payload];
      });
    };
    const onUserLeft = (payload) => {
      setCollaborators((current) => current.filter((entry) => entry.userId !== payload.userId));
      if (payload?.name) {
        toast({
          title: "Collaborator left",
          description: `${payload.name} disconnected from the room.`,
        });
      }
    };
    const onCodeChange = (payload) => {
      if (payload.fileName !== selectedFile) return;
      syncGuardRef.current = true;
      setEditorContent(payload.content || "");
    };
    const onUserJoinedNotification = (payload) => {
      toast({
        title: "Collaborator joined",
        description: `${payload.name} entered the room.`,
      });
    };
    const onWorkspaceUpdated = async (payload) => {
      await refreshDirectory();

      if (!room?.path) {
        return;
      }

      if (payload?.type === "delete-entry") {
        const deletedPath = toRelativeWorkspacePath(room.path, payload.path);
        if (selectedFile === deletedPath || selectedFile.startsWith(`${deletedPath}/`)) {
          setSelectedFile("");
          setEditorContent("");
        }
      }

      if (payload?.type === "rename-entry") {
        const oldRelativePath = toRelativeWorkspacePath(room.path, payload.oldPath);
        const newRelativePath = toRelativeWorkspacePath(room.path, payload.newPath);

        if (selectedFile === oldRelativePath) {
          setSelectedFile(newRelativePath);
        } else if (selectedFile.startsWith(`${oldRelativePath}/`)) {
          setSelectedFile(selectedFile.replace(oldRelativePath, newRelativePath));
        }
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("join-request", onJoinRequest);
    socket.on("join-approved", onJoinApproved);
    socket.on("join-rejected", onJoinRejected);
    socket.on("terminal-output", onTerminalOutput);
    socket.on("receive-message", onMessage);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("room-users", onRoomUsers);
    socket.on("cursor-update", onCursorUpdate);
    socket.on("user-left", onUserLeft);
    socket.on("code-change", onCodeChange);
    socket.on("user-joined-notification", onUserJoinedNotification);
    socket.on("workspace-updated", onWorkspaceUpdated);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("join-request", onJoinRequest);
      socket.off("join-approved", onJoinApproved);
      socket.off("join-rejected", onJoinRejected);
      socket.off("terminal-output", onTerminalOutput);
      socket.off("receive-message", onMessage);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("room-users", onRoomUsers);
      socket.off("cursor-update", onCursorUpdate);
      socket.off("user-left", onUserLeft);
      socket.off("code-change", onCodeChange);
      socket.off("user-joined-notification", onUserJoinedNotification);
      socket.off("workspace-updated", onWorkspaceUpdated);
    };
  }, [accessToken, dispatch, inviteToken, isAuthenticated, room?._id, room?.path, selectedFile]);

  useEffect(() => {
    if (!selectedFile || !isReady || !room?.path) {
      return;
    }

    const socket = getSocket();
    socket?.emit("read-file", { fileName: `${room.path}${selectedFile}` }, (response) => {
      if (response?.success) {
        setEditorContent(response.content || "");
      }
    });
  }, [isReady, room?.path, selectedFile]);

  const handleSave = () => {
    if (!selectedFile || !room?.path) return Promise.resolve(false);

    return ensureRoomSocket()
      .then((socket) => {
        return new Promise((resolve) => {
          socket.emit(
            "write-file",
            { fileName: `${room.path}${selectedFile}`, content: editorContent },
            (response) => {
              if (response?.success) {
                toast({ title: "File saved", description: selectedFile.replace(/^\//, "") });
                resolve(true);
              } else {
                toast({
                  title: "Save failed",
                  description: "The backend rejected the write request.",
                  variant: "destructive",
                });
                resolve(false);
              }
            },
          );
        });
      })
      .catch(() => {
        toast({
          title: "Socket disconnected",
          description: "Reconnect to use editor, terminal, and chat.",
          variant: "destructive",
        });
        return false;
      });
  };

  const handleEditorChange = (value) => {
    setEditorContent(value);
    if (syncGuardRef.current) {
      syncGuardRef.current = false;
      return;
    }

    const socket = getSocket();
    if (socket && selectedFile) {
      socket.emit("code-change", {
        fileName: selectedFile,
        content: value,
      });
    }
  };

  const handleCursorChange = () => {
    const position = editorRef.current?.getPosition();
    if (!position) return;
    getSocket()?.emit("cursor-move", { position });
  };

  const handleApprovalDecision = (request, action) => {
    getSocket()?.emit("handle-join-request", {
      roomId: request.roomId,
      socketId: request.socketId,
      action,
    });
    dispatch(removeApprovalRequest(request.socketId));
  };

  const handleSendMessage = (message) => {
    ensureRoomSocket()
      .then((socket) => {
        socket.emit("send-message", { message }, (response) => {
          if (!response?.success) {
            toast({
              title: "Message failed",
              description: "Could not deliver your message.",
              variant: "destructive",
            });
          }
        });
      })
      .catch(() => {
        toast({
          title: "Socket disconnected",
          description: "Reconnect before sending messages.",
          variant: "destructive",
        });
      });
  };

  const handleTyping = (isTyping) => {
    getSocket()?.emit(isTyping ? "typing" : "stop-typing");
  };

  const copyInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${inviteToken}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast({ title: "Invite copied", description: inviteUrl });
  };

  const handleCreateTerminalSession = () => {
    setTerminalSessions((current) => {
      const nextIndex = current.length + 1;
      const nextSession = createTerminalSession(nextIndex);
      setActiveTerminalId(nextSession.id);
      setIsTerminalVisible(true);
      setActiveTab("terminal");
      return [...current, nextSession];
    });
  };

  const handleClearTerminalSession = (terminalId) => {
    setTerminalSessions((current) =>
      current.map((session) => (session.id === terminalId ? { ...session, buffer: "" } : session)),
    );
  };

  const handleRunFile = async (terminalId) => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Choose a file before running it.",
        variant: "destructive",
      });
      return;
    }

    const command = getRunCommand(selectedFile);
    if (!command) {
      toast({
        title: "Run not supported",
        description: "Use a .py, .js, or .sh file for quick run.",
        variant: "destructive",
      });
      return;
    }

    const saved = await handleSave();
    if (!saved) return;

    try {
      const socket = await ensureRoomSocket();
      socket.emit("start-terminal", { inviteToken, terminalId });
      socket.emit("terminal-input", { terminalId, data: command });
      setIsTerminalVisible(true);
      setIsTerminalExpanded(true);
      setActiveTab("terminal");
      setActiveTerminalId(terminalId);
    } catch {
      toast({
        title: "Terminal unavailable",
        description: "Reconnect before running your file.",
        variant: "destructive",
      });
    }
  };

  const refreshDirectory = async () => {
    if (room?._id) {
      await dispatch(getRoomDirectory(room._id));
    }
  };

  const ensureRoomSocket = async () => {
    const socket = connectSocket(accessToken || "");

    if (socket.connected && isReady) {
      return socket;
    }

    const ensureConnected = () => {
      if (socket.connected) {
        return Promise.resolve(socket);
      }

      dispatch(setSocketStatus("connecting"));

      return new Promise((resolve, reject) => {
        const handleConnect = () => {
          window.clearTimeout(timeoutId);
          socket.off("connect_error", handleError);
          resolve(socket);
        };

        const handleError = () => {
          window.clearTimeout(timeoutId);
          socket.off("connect", handleConnect);
          reject(new Error("Unable to reconnect socket"));
        };

        const timeoutId = window.setTimeout(() => {
          socket.off("connect", handleConnect);
          socket.off("connect_error", handleError);
          reject(new Error("Socket connection timed out"));
        }, 3000);

        socket.once("connect", handleConnect);
        socket.once("connect_error", handleError);
        socket.connect();
      });
    };

    const connectedSocket = await ensureConnected();

    if (!inviteToken) {
      return connectedSocket;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Room join timed out"));
      }, 3000);

      connectedSocket.emit("join-room", { inviteToken }, (response) => {
        window.clearTimeout(timeoutId);

        if (!response?.success) {
          reject(new Error(response?.message || "Unable to join room"));
          return;
        }

        if (response.pending) {
          reject(new Error(response.message || "Waiting for approval"));
          return;
        }

        setIsReady(true);
        dispatch(setJoinState({ state: "approved", message: response.message || "Joined room" }));
        resolve(connectedSocket);
      });
    });
  };

  const scheduleDirectoryRefresh = () => {
    if (!room?._id) return;
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      dispatch(getRoomDirectory(room._id));
      refreshTimerRef.current = null;
    }, 500);
  };

  const handleCreateFile = async (relativePath) => {
    if (!room?.path) {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before creating files.",
        variant: "destructive",
      });
      return false;
    }

    setCreatingEntry(true);
    try {
      const socket = await ensureRoomSocket();
      return await new Promise((resolve) => {
        socket.emit(
          "create-file",
          { fileName: `${room.path}/${relativePath}`.replace(/\/+/g, "/") },
          async (response) => {
            setCreatingEntry(false);
            if (response?.success) {
              await refreshDirectory();
              const nextPath = `/${relativePath.replace(/^\/+/, "")}`;
              setSelectedFile(nextPath);
              toast({ title: "File created", description: nextPath });
              resolve(true);
            } else {
              toast({
                title: "Create file failed",
                description: response?.message || "Could not create file.",
                variant: "destructive",
              });
              resolve(false);
            }
          },
        );
      });
    } catch {
      setCreatingEntry(false);
      toast({
        title: "Socket disconnected",
        description: "Reconnect before creating files.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleCreateFolder = async (relativePath) => {
    if (!room?.path) {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before creating folders.",
        variant: "destructive",
      });
      return false;
    }

    setCreatingEntry(true);
    try {
      const socket = await ensureRoomSocket();
      return await new Promise((resolve) => {
        socket.emit(
          "create-folder",
          { folderName: `${room.path}/${relativePath}`.replace(/\/+/g, "/") },
          async (response) => {
            setCreatingEntry(false);
            if (response?.success) {
              await refreshDirectory();
              toast({ title: "Folder created", description: `/${relativePath.replace(/^\/+/, "")}` });
              resolve(true);
            } else {
              toast({
                title: "Create folder failed",
                description: response?.message || "Could not create folder.",
                variant: "destructive",
              });
              resolve(false);
            }
          },
        );
      });
    } catch {
      setCreatingEntry(false);
      toast({
        title: "Socket disconnected",
        description: "Reconnect before creating folders.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleRenameEntry = async (node, nextName) => {
    if (!room?.path || !node) {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before renaming files.",
        variant: "destructive",
      });
      return false;
    }

    const parentPath = getParentPath(node.path);
    const relativeNextPath = joinPaths(parentPath, nextName);

    try {
      const socket = await ensureRoomSocket();
      return await new Promise((resolve) => {
        socket.emit(
          "rename-entry",
          {
            oldPath: `${room.path}${node.path}`,
            newPath: `${room.path}/${relativeNextPath}`.replace(/\/+/g, "/"),
          },
          async (response) => {
            if (response?.success) {
              await refreshDirectory();
              if (selectedFile === node.path && node.type === "file") {
                setSelectedFile(`/${relativeNextPath.replace(/^\/+/, "")}`);
              }
              toast({ title: "Renamed", description: `${node.name} -> ${nextName}` });
              resolve(true);
            } else {
              toast({
                title: "Rename failed",
                description: response?.message || "Could not rename entry.",
                variant: "destructive",
              });
              resolve(false);
            }
          },
        );
      });
    } catch {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before renaming files.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteEntry = async (node) => {
    if (!room?.path || !node) {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before deleting files.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const socket = await ensureRoomSocket();
      return await new Promise((resolve) => {
        socket.emit(
          "delete-entry",
          {
            targetPath: `${room.path}${node.path}`,
          },
          async (response) => {
            if (response?.success) {
              await refreshDirectory();

              if (
                selectedFile === node.path ||
                (node.type === "folder" && selectedFile.startsWith(`${node.path}/`))
              ) {
                setSelectedFile("");
                setEditorContent("");
              }

              toast({
                title: node.type === "folder" ? "Folder deleted" : "File deleted",
                description: node.path,
              });
              resolve(true);
            } else {
              toast({
                title: "Delete failed",
                description: response?.message || "Could not delete entry.",
                variant: "destructive",
              });
              resolve(false);
            }
          },
        );
      });
    } catch {
      toast({
        title: "Socket disconnected",
        description: "Reconnect before deleting files.",
        variant: "destructive",
      });
      return false;
    }
  };

  if (joinState === "failed" || joinState === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Room unavailable</h1>
          <p className="mt-3 text-sm text-slate-400">{joinMessage}</p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2d2d30] bg-[#181818] px-5 py-4">
        <div className="flex items-center gap-3">
          {!isExplorerVisible ? (
            <Button
              className="h-9 rounded-md border border-[#2d2d30] bg-[#252526] px-3 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => setIsExplorerVisible(true)}
              size="sm"
              title="Show Explorer (Ctrl+B)"
              type="button"
              variant="ghost"
            >
              <PanelLeftOpen className="mr-2 h-4 w-4" />
              Explorer
            </Button>
          ) : null}
          <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100" to="/dashboard">
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="hidden h-5 w-px bg-slate-800 sm:block" />
          <div>
            <h1 className="text-lg font-semibold text-white">{room?.roomName || "Shared room"}</h1>
            <p className="text-xs text-slate-500">{inviteToken}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionStatus status={status} />
          {!isRightPanelVisible ? (
            <Button
              className="h-9 rounded-md border border-[#2d2d30] bg-[#252526] px-3 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => setIsRightPanelVisible(true)}
              size="sm"
              title="Show Chat Panel"
              type="button"
              variant="ghost"
            >
              <PanelRightOpen className="mr-2 h-4 w-4" />
              Chat
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={copyInvite}>
            <Copy className="mr-2 h-4 w-4" />
            Copy invite
          </Button>
        </div>
      </header>

      {joinState === "pending" ? (
        <div className="flex items-center justify-center px-6">
          <div className="max-w-xl rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center">
            <BellRing className="mx-auto h-10 w-10 text-cyan-300" />
            <h2 className="mt-4 text-2xl font-bold text-white">Waiting for approval</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {joinMessage || "The room owner needs to approve your request before you can enter."}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="grid min-h-0 overflow-hidden"
          style={{
            gridTemplateColumns: `${
              isExplorerVisible ? "18rem" : "0rem"
            } minmax(0,1fr) ${isRightPanelVisible ? "minmax(22rem,24rem)" : "0rem"}`,
          }}
        >
          <aside
            className={`min-h-0 overflow-hidden border-r border-[#2d2d30] ${
              isExplorerVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <FileExplorer
              entries={entries}
              loading={creatingEntry}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteEntry={handleDeleteEntry}
              onHide={() => setIsExplorerVisible(false)}
              onRenameEntry={handleRenameEntry}
              onSelectFile={setSelectedFile}
              selectedFile={selectedFile}
            />
          </aside>

          <section
            className="grid min-h-0 min-w-0 overflow-hidden border-r border-[#2d2d30]"
            style={{
              gridTemplateRows: isTerminalVisible
                ? `minmax(0,1fr) ${isTerminalExpanded ? "32rem" : "18rem"}`
                : "minmax(0,1fr) auto",
            }}
          >
            <div className="min-h-0 min-w-0">
              <EditorPane
                collaborators={collaborators}
                fileName={selectedFile}
                onChange={handleEditorChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  editor.onDidChangeCursorPosition(handleCursorChange);
                }}
                onSave={handleSave}
                value={editorContent}
              />
            </div>
            {!isTerminalVisible ? (
              <div className="flex items-center border-t border-[#2d2d30] bg-[#181818] px-3 py-2">
                <Button
                  className="h-9 rounded-md border border-[#2d2d30] bg-[#252526] px-4 text-[#cccccc] hover:bg-[#2a2d2e]"
                  onClick={() => {
                    setActiveTab("terminal");
                    setIsTerminalExpanded(true);
                    setIsTerminalVisible(true);
                  }}
                  size="sm"
                  title="Show Terminal"
                  type="button"
                  variant="ghost"
                >
                  <PanelBottomOpen className="mr-2 h-4 w-4" />
                  Show Terminal
                </Button>
              </div>
            ) : null}
            {isTerminalVisible ? (
              <div className="min-h-0 min-w-0 overflow-hidden border-t border-[#2d2d30]">
                <Tabs className="flex h-full flex-col" value={activeTab} onValueChange={setActiveTab}>
                  <div className="border-b border-[#2d2d30] bg-[#181818] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <TabsList className="border-[#2d2d30] bg-[#1f1f1f]">
                        <TabsTrigger value="terminal">
                          <TerminalSquare className="mr-2 h-4 w-4" />
                          Terminal
                        </TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                      </TabsList>
                    </div>
                  </div>
                  <TabsContent className="min-h-0 flex-1 overflow-hidden" value="terminal">
                    <TerminalPane
                      active={activeTab === "terminal"}
                      activeSessionId={activeTerminalId}
                      canRunFile={Boolean(selectedFile)}
                      inviteToken={inviteToken}
                      onActiveSessionChange={setActiveTerminalId}
                      onClearSession={handleClearTerminalSession}
                      onCreateSession={handleCreateTerminalSession}
                      onHide={() => {
                        setIsTerminalExpanded(false);
                        setIsTerminalVisible(false);
                      }}
                      onRunFile={handleRunFile}
                      onTerminalActivity={scheduleDirectoryRefresh}
                      ready={isReady}
                      sessions={terminalSessions}
                      socket={getSocket()}
                    />
                  </TabsContent>
                  <TabsContent className="h-full overflow-hidden" value="activity">
                    <div className="scrollbar-thin h-full overflow-y-auto bg-[#1e1e1e] p-4 text-sm text-[#9da1a6]">
                      <div className="mb-3 flex items-center gap-2 text-[#cccccc]">
                        <Users className="h-4 w-4 text-[#4fc1ff]" />
                        Active collaborators
                      </div>
                      <div className="space-y-2">
                        {collaborators.length ? (
                          collaborators.map((collaborator) => (
                            <div
                              key={collaborator.userId}
                              className="rounded-md border border-[#2d2d30] bg-[#252526] px-3 py-2"
                            >
                              {collaborator.userId} at line {collaborator.position?.lineNumber}
                            </div>
                          ))
                        ) : (
                          <p>No live cursor movement yet.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </section>

          <aside
            className={`min-h-0 min-w-0 overflow-hidden bg-[#181818] ${
              isRightPanelVisible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Tabs className="flex h-full flex-col" value={rightPanelTab} onValueChange={setRightPanelTab}>
              <div className="border-b border-[#2d2d30] bg-[#181818] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <TabsList className="border-[#2d2d30] bg-[#1f1f1f]">
                  <TabsTrigger value="chat">
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="activity-panel">People ({roomUsers.length})</TabsTrigger>
                  </TabsList>
                  <Button
                    className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
                    onClick={() => setIsRightPanelVisible(false)}
                    size="sm"
                    title="Hide Chat Panel"
                    type="button"
                    variant="ghost"
                  >
                    <PanelRightOpen className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </div>
              <TabsContent className="min-h-0 flex-1 overflow-hidden" value="chat">
                <ChatPanel
                  messages={messages}
                  onHide={() => setIsRightPanelVisible(false)}
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  typingUsers={typingUsers}
                />
              </TabsContent>
              <TabsContent className="h-full" value="activity-panel">
                <div className="scrollbar-thin h-full overflow-y-auto bg-[#181818] p-4 text-sm text-[#9da1a6]">
                  <div className="mb-3 flex items-center gap-2 text-[#cccccc]">
                    <Users className="h-4 w-4 text-[#4fc1ff]" />
                    People in room ({roomUsers.length})
                  </div>
                  <div className="space-y-2">
                    {roomUsers.length ? (
                      roomUsers.map((member) => (
                        <div
                          key={`side-${member.userId}`}
                          className="flex items-center gap-3 rounded-md border border-[#2d2d30] bg-[#252526] px-3 py-3"
                        >
                          <UserAvatar
                            className="h-10 w-10 rounded-full"
                            name={member.name}
                            ringColor={member.userColor}
                            user={{ avatar: member.avatar, name: member.name }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{member.name}</p>
                            <p className="truncate text-xs text-[#9da1a6]">{member.email || "No email available"}</p>
                            <p className="text-[11px] text-[#858585]">{member.userColor}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No one else is connected right now.</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      )}

      <RoomApprovalDialog onDecision={handleApprovalDecision} request={approvalRequests[0]} />
    </div>
  );
}

export default Room;
