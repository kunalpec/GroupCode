import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

function RoomApprovalDialog({ request, onDecision }) {
  return (
    <Dialog open={Boolean(request)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join request</DialogTitle>
          <DialogDescription>
            Someone is waiting for your approval before entering the room.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <img
                alt={request.name}
                className="h-12 w-12 rounded-2xl border border-slate-700 object-cover"
                src={request.avatar || "https://placehold.co/96x96/0f172a/e2e8f0?text=U"}
              />
              <div>
                <p className="text-base font-semibold text-slate-100">{request.name}</p>
                <p className="text-sm text-slate-400">Socket: {request.socketId}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => onDecision(request, "accept")}>
                Accept
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => onDecision(request, "reject")}>
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
