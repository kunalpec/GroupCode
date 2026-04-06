import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

function RoomApprovalDialog({ request, onDecision }) {
  return (
    <Dialog open={Boolean(request)}>
      <DialogContent className="border-[#2d2d30] bg-[#1e1e1e] text-[#cccccc] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#cccccc]">Join request</DialogTitle>
          <DialogDescription className="text-[#9da1a6]">
            Someone is waiting for your approval before entering the room.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-md border border-[#2d2d30] bg-[#252526] p-4">
              <img
                alt={request.name}
                className="h-10 w-10 rounded-md border border-[#2d2d30] object-cover"
                src={request.avatar || "https://placehold.co/96x96/0f172a/e2e8f0?text=U"}
              />
              <div>
                <p className="text-sm font-semibold text-white">{request.name}</p>
                <p className="text-xs text-[#9da1a6]">Socket: {request.socketId}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 border border-[#0e639c] bg-[#0e639c] text-white hover:bg-[#1177bb]"
                onClick={() => onDecision(request, "accept")}
              >
                Accept
              </Button>
              <Button
                className="flex-1 border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"
                variant="secondary"
                onClick={() => onDecision(request, "reject")}
              >
                Reject
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default RoomApprovalDialog;
