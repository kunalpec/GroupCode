import { useEffect, useRef } from "react";
import { PanelBottomClose, TerminalSquare } from "lucide-react";
import { Button } from "./ui/button";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

function TerminalPane({ socket, active, ready, inviteToken, onHide, onTerminalActivity }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!active || !ready || !containerRef.current || terminalRef.current) {
      return undefined;
    }

    const terminal = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#aeafad",
        selectionBackground: "#264f78",
      },
      fontFamily: "JetBrains Mono",
      fontSize: 13,
      cursorBlink: true,
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;

    const resize = () => fitAddon.fit();
    window.addEventListener("resize", resize);

    const disposeData = terminal.onData((data) => {
      socket?.emit("terminal-input", data);
      if (data.includes("\r")) {
        onTerminalActivity?.();
      }
    });

    return () => {
      window.removeEventListener("resize", resize);
      disposeData.dispose();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [active, ready, socket]);

  useEffect(() => {
    if (!socket || !active || !ready) {
      return undefined;
    }

    socket.emit("start-terminal", { inviteToken });
    const handleOutput = (data) => {
      terminalRef.current?.write(data);
    };
    socket.on("terminal-output", handleOutput);

    return () => {
      socket.off("terminal-output", handleOutput);
    };
  }, [active, inviteToken, onTerminalActivity, ready, socket]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-2 border-b border-[#2d2d30] px-4 py-3 text-sm font-semibold text-[#cccccc]">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-[#4fc1ff]" />
          Terminal
        </div>
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
      <div ref={containerRef} className="terminal-shell min-h-0 h-full w-full overflow-hidden px-2 py-3" />
    </div>
  );
}

export default TerminalPane;
