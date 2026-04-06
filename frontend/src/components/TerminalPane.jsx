import { useEffect, useRef } from "react";
import { Eraser, PanelBottomClose, Play, Plus, TerminalSquare } from "lucide-react";
import { Button } from "./ui/button";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

function TerminalPane({
  socket,
  active,
  ready,
  inviteToken,
  onHide,
  onTerminalActivity,
  sessions,
  activeSessionId,
  onActiveSessionChange,
  onCreateSession,
  onClearSession,
  onRunFile,
  canRunFile,
}) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const activeSessionIdRef = useRef(activeSessionId);
  const renderedSessionIdRef = useRef("");
  const renderedBufferRef = useRef("");
  const pendingEchoRef = useRef("");
  const activeSession = sessions.find((session) => session.id === activeSessionId) || sessions[0] || null;

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!active || !ready || !containerRef.current || terminalRef.current) {
      return undefined;
    }

    const terminal = new Terminal({
      theme: {
        background: "#181818",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "#264f78",
        black: "#000000",
        brightBlack: "#666666",
      },
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 13.5,
      fontWeight: 400,
      lineHeight: 1.2,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 1500,
      allowTransparency: false,
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    fitAddonRef.current = fitAddon;
    terminalRef.current = terminal;

    const resize = () => fitAddon.fit();
    window.addEventListener("resize", resize);

    const disposeData = terminal.onData((data) => {
      if (!activeSessionIdRef.current) return;

      // Show typed characters immediately so the terminal feels responsive.
      if (data === "\u007f") {
        if (pendingEchoRef.current) {
          pendingEchoRef.current = pendingEchoRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (data !== "\r") {
        pendingEchoRef.current += data;
        terminal.write(data);
      }

      socket?.emit("terminal-input", { terminalId: activeSessionIdRef.current, data });
      if (data.includes("\r")) {
        onTerminalActivity?.();
      }
    });

    return () => {
      window.removeEventListener("resize", resize);
      disposeData.dispose();
      terminal.dispose();
      fitAddonRef.current = null;
      terminalRef.current = null;
    };
  }, [active, onTerminalActivity, ready, socket]);

  useEffect(() => {
    if (!active || !terminalRef.current) {
      return;
    }

    const nextSessionId = activeSessionId || "";
    const nextBuffer = activeSession?.buffer || "";
    const terminal = terminalRef.current;

    if (renderedSessionIdRef.current !== nextSessionId) {
      terminal.reset();
      terminal.write(nextBuffer);
      pendingEchoRef.current = "";
    } else if (!nextBuffer) {
      terminal.reset();
      pendingEchoRef.current = "";
    } else if (nextBuffer.startsWith(renderedBufferRef.current)) {
      let delta = nextBuffer.slice(renderedBufferRef.current.length);

      if (pendingEchoRef.current && delta) {
        let matched = 0;
        const limit = Math.min(delta.length, pendingEchoRef.current.length);
        while (matched < limit && delta[matched] === pendingEchoRef.current[matched]) {
          matched += 1;
        }

        if (matched > 0) {
          delta = delta.slice(matched);
          pendingEchoRef.current = pendingEchoRef.current.slice(matched);
        }
      }

      if (delta) {
        terminal.write(delta);
      }
    } else {
      terminal.reset();
      terminal.write(nextBuffer);
      pendingEchoRef.current = "";
    }

    renderedSessionIdRef.current = nextSessionId;
    renderedBufferRef.current = nextBuffer;
    fitAddonRef.current?.fit();
  }, [active, activeSession?.buffer, activeSessionId]);

  useEffect(() => {
    if (!socket || !active || !ready || !activeSessionId) {
      return undefined;
    }

    socket.emit("start-terminal", { inviteToken, terminalId: activeSessionId });
    return undefined;
  }, [active, activeSessionId, inviteToken, ready, socket]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-2 border-b border-[#2d2d30] bg-[#181818] px-4 py-3 text-sm font-semibold text-[#cccccc]">
        <div className="flex min-w-0 items-center gap-2">
          <TerminalSquare className="h-4 w-4 shrink-0 text-[#4fc1ff]" />
          <div className="flex min-w-0 items-center gap-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  session.id === activeSessionId
                    ? "bg-[#094771] text-white"
                    : "bg-[#252526] text-[#a9b1ba] hover:bg-[#2a2d2e] hover:text-white"
                }`}
                onClick={() => onActiveSessionChange(session.id)}
                type="button"
              >
                {session.label}
              </button>
            ))}
            <Button
              className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={onCreateSession}
              size="sm"
              title="New terminal"
              type="button"
              variant="ghost"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className="h-8 gap-2 px-3 text-[#cccccc] hover:bg-[#2a2d2e]"
            disabled={!canRunFile || !activeSessionId}
            onClick={() => onRunFile(activeSessionId)}
            size="sm"
            title="Save and run current file"
            type="button"
            variant="ghost"
          >
            <Play className="h-4 w-4" />
            Run File
          </Button>
          <Button
            className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
            disabled={!activeSessionId}
            onClick={() => onClearSession(activeSessionId)}
            size="sm"
            title="Clear terminal"
            type="button"
            variant="ghost"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
            onClick={onHide}
            size="sm"
            title="Hide Terminal"
            type="button"
            variant="ghost"
          >
            <PanelBottomClose className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="terminal-shell min-h-0 h-full w-full overflow-hidden" />
    </div>
  );
}

export default TerminalPane;
