import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-flex">{children}</div>;
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) return children;
  return <span>{children}</span>;
}

export function TooltipContent({ className, children, side = "top" }: { className?: string; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  const sideClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-1",
  }[side];
  return (
    <div className={cn("pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow group-hover:opacity-100 opacity-0 transition-opacity", sideClass, className)}>
      {children}
    </div>
  );
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
