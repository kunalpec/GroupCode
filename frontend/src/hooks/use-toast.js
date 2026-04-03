import { useSyncExternalStore } from "react";

const listeners = new Set();
let toasts = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export function toast({ title, description, variant = "default", duration = 3500 }) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, title, description, variant, duration }];
  emit();
  return id;
}

export function dismissToast(id) {
  toasts = toasts.filter((toastItem) => toastItem.id !== id);
  emit();
}

export function useToast() {
  const items = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => toasts,
  );

  return {
    toasts: items,
    toast,
    dismissToast,
  };
}
