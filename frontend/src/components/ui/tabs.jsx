import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

function Tabs(props) {
  return <TabsPrimitive.Root {...props} />;
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-xl border border-slate-700/70 bg-[#1f1f1f] p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition outline-none hover:text-slate-200 data-[state=active]:bg-[#264f78] data-[state=active]:text-white",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
