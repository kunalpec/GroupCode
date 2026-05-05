import { ArrowRight, Clock3, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

function RoomGrid({ currentUserId, deletingRoomId, onDeleteRoom, rooms }) {
  if (!rooms.length) {
    return (
      <div className="border border-dashed border-[#3c3c3c] bg-[#252526] p-8 text-center text-[#9da1a6]">
        No rooms yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 overflow-hidden">
      {rooms.map((room) => (
        <Link
          key={room._id}
          to={`/room/${room.inviteToken}`}
          className="group w-full max-w-[25rem] overflow-hidden border border-[#333333] bg-[#252526] p-5 transition hover:border-[#3b82f6]/40 hover:bg-[#2a2d2e]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{room.roomName}</h3>
              <p className="mt-1 truncate text-sm text-[#9da1a6]">{room.dockerRoomName}</p>
            </div>
            <div className="flex items-center gap-2">
              {String(room.owner) === String(currentUserId) ? (
                <Button
                  className="h-8 rounded-none px-2 text-[#f48771] hover:bg-[#3a1f1f] hover:text-[#ffb4a6]"
                  disabled={deletingRoomId === room._id}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDeleteRoom?.(room);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
              <ArrowRight className="h-5 w-5 text-[#6a6a6a] transition group-hover:text-[#3794ff]" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 overflow-hidden text-xs text-[#9da1a6]">
            <span className="inline-flex items-center gap-2 border border-[#3c3c3c] px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {room.users?.length || 0} members
            </span>
            <span className="inline-flex items-center gap-2 border border-[#3c3c3c] px-3 py-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Ready to join
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default RoomGrid;
