import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#007acc]/50 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "border-[#0e639c] bg-[#0e639c] text-white hover:border-[#1177bb] hover:bg-[#1177bb]",
        secondary: "border-[#3c3c3c] bg-[#2d2d30] text-[#cccccc] hover:bg-[#37373d] hover:text-white",
        ghost: "border-transparent bg-transparent text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white",
        outline: "border-[#3c3c3c] bg-[#252526] text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white",
        danger: "bg-rose-500 text-white hover:bg-rose-400",
      },
      size: {
        default: "h-9",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
