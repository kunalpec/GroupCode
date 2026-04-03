import { ArrowRight, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";

function RoomGrid({ rooms }) {
  if (!rooms.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-slate-400">
        No rooms yet. Create one from the sidebar to launch your first collaborative workspace.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => (
        <Link
          key={room._id}
          to={`/room/${room.inviteToken}`}
          className="group rounded-3xl border border-slate-800 bg-slate-950/60 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">{room.roomName}</h3>
              <p className="mt-1 text-sm text-slate-400">{room.dockerRoomName}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:text-cyan-300" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {room.users?.length || 0} members
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5">
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
