import * as ToastPrimitive from "@radix-ui/react-toast";
import { useEffect } from "react";
import { X } from "lucide-react";
import { dismissToast, useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";

function Toaster() {
  const { toasts } = useToast();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), toast.duration),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts]);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          open
          onOpenChange={(open) => {
            if (!open) dismissToast(toast.id);
          }}
          className={cn(
            "fixed right-4 z-[100] w-80 rounded-2xl border p-4 shadow-xl backdrop-blur",
            toast.variant === "destructive"
              ? "top-4 border-rose-500/40 bg-rose-950/90"
              : "top-4 border-slate-700 bg-slate-900/95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <ToastPrimitive.Title className="font-semibold text-slate-50">
                {toast.title}
              </ToastPrimitive.Title>
              {toast.description ? (
                <ToastPrimitive.Description className="text-sm text-slate-300">
                  {toast.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </div>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
}

export { Toaster };
