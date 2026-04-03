import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

function Tabs(props) {
  return <TabsPrimitive.Root {...props} />;
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-md border border-[#3c3c3c] bg-[#252526] p-1",
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
        "inline-flex h-8 min-w-[84px] items-center justify-center rounded-sm px-3 py-2 text-sm font-medium text-[#9da1a6] transition outline-none hover:text-[#cccccc] data-[state=active]:bg-[#094771] data-[state=active]:text-white",
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
