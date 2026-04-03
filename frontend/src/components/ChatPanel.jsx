import { useEffect, useRef, useState } from "react";
import { MessageSquareText, PanelRightClose, SendHorizonal } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function ChatPanel({ messages, onHide, typingUsers, onSendMessage, onTyping }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const container = listRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSendMessage(draft);
    setDraft("");
    onTyping(false);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#181818]">
      <div className="flex items-center justify-between gap-2 border-b border-[#2d2d30] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-[#4fc1ff]" />
          <h3 className="text-sm font-semibold text-[#cccccc]">Team Chat</h3>
        </div>
        <Button
          className="h-8 px-2 text-[#cccccc] hover:bg-[#2a2d2e]"
          onClick={onHide}
          size="sm"
          title="Hide Chat Panel"
          type="button"
          variant="ghost"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={listRef}
        className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-3"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.userId}-${message.time}-${index}`}
            className="overflow-hidden rounded-md border border-[#2d2d30] bg-[#1f1f1f] p-3"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                className="h-8 w-8 rounded-full"
                name={message.username}
                user={{ avatar: message.avatar }}
              />
              <div>
                <p className="text-sm font-semibold text-[#d4d4d4]">{message.username}</p>
                <p className="text-xs text-[#858585]">{new Date(message.time).toLocaleTimeString()}</p>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#c5c5c5]">
              {message.message}
            </p>
          </div>
        ))}

        {typingUsers.length ? (
          <p className="text-xs text-[#4fc1ff]">
            {typingUsers.map((user) => user.name).join(", ")} typing...
          </p>
        ) : null}
      </div>

      <form className="shrink-0 border-t border-[#2d2d30] p-3" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <Input
            className="h-9 rounded-md border-[#3c3c3c] bg-[#1e1e1e] text-[#d4d4d4]"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              onTyping(Boolean(event.target.value.trim()));
            }}
            placeholder="Share context with the room..."
          />
          <Button size="sm" type="submit">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
