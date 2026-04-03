import Editor from "@monaco-editor/react";
import { Save } from "lucide-react";
import { Button } from "./ui/button";

function EditorPane({ value, fileName, onChange, onMount, onSave, collaborators }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-[#2d2d30] bg-[#252526] px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold text-[#cccccc]">{fileName || "No file selected"}</p>
          <p className="text-xs text-[#858585]">
            {collaborators.length
              ? `${collaborators.length} live cursor${collaborators.length > 1 ? "s" : ""}`
              : "Realtime sync ready"}
          </p>
        </div>
        <Button size="sm" onClick={onSave} disabled={!fileName}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("vscode-night", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "comment", foreground: "6A9955" },
                { token: "keyword", foreground: "C586C0" },
                { token: "string", foreground: "CE9178" },
                { token: "number", foreground: "B5CEA8" },
                { token: "type", foreground: "4EC9B0" },
              ],
              colors: {
                "editor.background": "#1e1e1e",
                "editor.foreground": "#d4d4d4",
                "editorLineNumber.foreground": "#858585",
                "editorLineNumber.activeForeground": "#c6c6c6",
                "editorCursor.foreground": "#aeafad",
                "editor.selectionBackground": "#264f78",
                "editor.inactiveSelectionBackground": "#3a3d41",
                "editor.lineHighlightBackground": "#2a2d2e",
                "editorIndentGuide.background1": "#404040",
                "editorIndentGuide.activeBackground1": "#707070",
                "editorGutter.background": "#1e1e1e",
              },
            });
          }}
          height="100%"
          onChange={(nextValue) => onChange(nextValue || "")}
          onMount={onMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "JetBrains Mono",
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
          path={fileName || "untitled.js"}
          theme="vscode-night"
          value={value}
        />
      </div>

      <div className="border-t border-[#2d2d30] bg-[#181818] px-4 py-2 text-xs text-[#858585]">
        Cursor updates broadcast automatically while you edit.
      </div>
    </div>
  );
}

export default EditorPane;
