import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  PanelLeftClose,
  Pencil,
  Trash2,
} from "lucide-react";
import { FileIcon, defaultStyles } from "react-file-icon";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function getFileExtension(path) {
  const lower = path.toLowerCase();
  const fileName = lower.split("/").pop() || "";
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop() || "";
}

function getFileIcon(path) {
  const extension = getFileExtension(path);
  const iconStyleMap = {
    css: { ...defaultStyles.css, color: "#264de4", labelColor: "#264de4" },
    html: { ...defaultStyles.html, color: "#e34f26", labelColor: "#e34f26" },
    js: { ...defaultStyles.js, color: "#f7df1e", labelColor: "#f7df1e", labelTextColor: "#1e1e1e" },
    jsx: { ...defaultStyles.jsx, color: "#00d8ff", labelColor: "#00d8ff", labelTextColor: "#1e1e1e" },
    json: { ...defaultStyles.json, color: "#f5c542", labelColor: "#f5c542", labelTextColor: "#1e1e1e" },
    py: { ...defaultStyles.py, color: "#3776ab", labelColor: "#ffde57", labelTextColor: "#1e1e1e" },
    sh: { ...defaultStyles.sh, color: "#89e051", labelColor: "#89e051", labelTextColor: "#1e1e1e" },
    ts: { ...defaultStyles.ts, color: "#3178c6", labelColor: "#3178c6" },
    tsx: { ...defaultStyles.tsx, color: "#3178c6", labelColor: "#00d8ff", labelTextColor: "#1e1e1e" },
  };
  const iconStyle = iconStyleMap[extension] || defaultStyles[extension] || defaultStyles.txt || {};

  return (
    <span className="h-[18px] w-[18px] shrink-0 overflow-hidden rounded-[3px]">
      <FileIcon extension={extension || "file"} {...iconStyle} />
    </span>
  );
}

function buildTree(entries) {
  const root = { name: "", path: "/", type: "folder", children: [] };

  for (const entry of entries || []) {
    if (!entry?.path || entry.path === "/") continue;

    const parts = entry.path.replace(/^\//, "").split("/");
    let pointer = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = `/${parts.slice(0, index + 1).join("/")}`;
      const type = isLast ? entry.type : "folder";

      let child = pointer.children.find((item) => item.path === currentPath);
      if (!child) {
        child = { name: part, path: currentPath, type, children: [] };
        pointer.children.push(child);
      }

      pointer = child;
    });
  }

  const sortTree = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  };

  sortTree(root);
  return root.children;
}

function getParentPath(path) {
  const parts = path.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${parts.slice(0, -1).join("/")}`;
}

function joinPaths(basePath, childName) {
  if (!basePath || basePath === "/") {
    return childName.replace(/^\/+/, "");
  }
  return `${basePath.replace(/^\/+/, "")}/${childName.replace(/^\/+/, "")}`;
}

function TreeNode({
  node,
  depth,
  expandedFolders,
  onContextMenu,
  onSelectFile,
  onToggle,
  selectedFile,
}) {
  const tag = node.type === "folder" ? "DIR" : "FILE";

  if (node.type === "folder") {
    const expanded = expandedFolders[node.path] ?? true;

    return (
      <div>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#cccccc] transition hover:bg-[#2a2d2e]"
          onClick={() => onToggle(node.path)}
          onContextMenu={(event) => onContextMenu(event, node)}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#cccccc]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#cccccc]" />
          )}
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-[#d7ba7d]" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-[#d7ba7d]" />
          )}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto rounded bg-[#2d2d30] px-1.5 py-0.5 text-[10px] text-[#8c8c8c]">
            {tag}
          </span>
        </button>

        {expanded
          ? node.children.map((child) => (
              <TreeNode
                key={child.path}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                node={child}
                onContextMenu={onContextMenu}
                onSelectFile={onSelectFile}
                onToggle={onToggle}
                selectedFile={selectedFile}
              />
            ))
          : null}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
        selectedFile === node.path
          ? "bg-[#37373d] text-[#ffffff]"
          : "text-[#cccccc] hover:bg-[#2a2d2e]",
      )}
      onClick={() => onSelectFile(node.path)}
      onContextMenu={(event) => onContextMenu(event, node)}
      style={{ paddingLeft: `${30 + depth * 14}px` }}
      type="button"
    >
      {getFileIcon(node.path)}
      <span className="truncate">{node.name}</span>
      <span className="ml-auto rounded bg-[#2d2d30] px-1.5 py-0.5 text-[10px] text-[#8c8c8c]">
        {tag}
      </span>
    </button>
  );
}

function FileExplorer({
  entries,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteEntry,
  onRenameEntry,
  onHide,
  loading,
}) {
  const [mode, setMode] = useState("");
  const [draftName, setDraftName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [activeNode, setActiveNode] = useState(null);

  const tree = useMemo(() => buildTree(entries), [entries]);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draftName.trim()) return;

    let success = false;
    if (mode === "folder") {
      success = await onCreateFolder(draftName.trim());
    } else if (mode === "rename") {
      success = await onRenameEntry(activeNode, draftName.trim());
    } else {
      success = await onCreateFile(draftName.trim());
    }

    if (success) {
      setDraftName("");
      setMode("");
      setContextMenu(null);
      setActiveNode(null);
    }
  };

  const startCreateAt = (type, basePath = "/") => {
    setMode(type);
    setDraftName(basePath === "/" ? "" : `${basePath.replace(/^\//, "")}/`);
    setActiveNode(null);
  };

  const startRename = (node) => {
    setActiveNode(node);
    setMode("rename");
    setDraftName(node.name);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#11151c]">
      <div className="border-b border-[#2d2d30] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-[#4fc1ff]" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#cccccc]">
              Explorer
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={onHide}
              size="sm"
              title="Hide Explorer (Ctrl+B)"
              type="button"
              variant="ghost"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <Button
              className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => startCreateAt("file")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <FilePlus2 className="h-4 w-4" />
            </Button>
            <Button
              className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => startCreateAt("folder")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {mode ? (
          <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
            <Input
              autoFocus
              className="h-9 rounded-md border-[#3c3c3c] bg-[#1e1e1e] text-[#d4d4d4]"
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={
                mode === "folder"
                  ? "src/components"
                  : mode === "rename"
                    ? "new-name"
                    : "src/index.js"
              }
              value={draftName}
            />
            <div className="flex gap-2">
              <Button className="h-8 flex-1 rounded-md" disabled={loading} size="sm" type="submit">
                {mode === "folder" ? "Create folder" : mode === "rename" ? "Rename" : "Create file"}
              </Button>
              <Button
                className="h-8 rounded-md"
                onClick={() => {
                  setMode("");
                  setDraftName("");
                  setContextMenu(null);
                  setActiveNode(null);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="border-b border-[#2d2d30] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#8c8c8c]">
        Room Files
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        {tree.length ? (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              depth={0}
              expandedFolders={expandedFolders}
              node={node}
              onContextMenu={(event, contextNode) => {
                event.preventDefault();
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  node: contextNode,
                });
              }}
              onSelectFile={onSelectFile}
              onToggle={(path) =>
                setExpandedFolders((current) => ({
                  ...current,
                  [path]: !(current[path] ?? true),
                }))
              }
              selectedFile={selectedFile}
            />
          ))
        ) : (
          <p className="px-2 py-4 text-sm text-[#6a6a6a]">No files discovered yet.</p>
        )}
      </div>

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-44 rounded-md border border-[#3c3c3c] bg-[#252526] p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[#cccccc] hover:bg-[#094771]"
            onClick={() => {
              const base = contextMenu.node.type === "folder"
                ? contextMenu.node.path
                : getParentPath(contextMenu.node.path);
              startCreateAt("file", base);
            }}
            type="button"
          >
            <FilePlus2 className="h-4 w-4" />
            New File
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[#cccccc] hover:bg-[#094771]"
            onClick={() => {
              const base = contextMenu.node.type === "folder"
                ? contextMenu.node.path
                : getParentPath(contextMenu.node.path);
              startCreateAt("folder", base);
            }}
            type="button"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[#cccccc] hover:bg-[#094771]"
            onClick={() => startRename(contextMenu.node)}
            type="button"
          >
            <Pencil className="h-4 w-4" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[#f48771] hover:bg-[#5a1d1d]"
            onClick={async () => {
              const success = await onDeleteEntry(contextMenu.node);
              if (success) {
                setContextMenu(null);
                setMode("");
                setDraftName("");
                setActiveNode(null);
              }
            }}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default FileExplorer;
export { getParentPath, joinPaths };
