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
            "fixed right-4 z-[100] w-[min(calc(100vw-2rem),28rem)] rounded-md border p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm",
            toast.variant === "destructive"
              ? "top-4 border-[#be1100] bg-[#3a1d1d]/95"
              : "top-4 border-[#3c3c3c] bg-[#252526]/95",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <ToastPrimitive.Title className="font-semibold text-[#f3f3f3]">
                {toast.title}
              </ToastPrimitive.Title>
              {toast.description ? (
                <ToastPrimitive.Description className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-5 text-[#cccccc]">
                  {toast.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="shrink-0 text-[#858585] hover:text-white">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </div>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-4 top-4 z-[100] flex max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none" />
    </ToastPrimitive.Provider>
  );
}

export { Toaster };
