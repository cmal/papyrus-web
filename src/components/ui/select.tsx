import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}
const SelectContext = React.createContext<SelectContextValue | null>(null);

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
  const [internal, setInternal] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const current = value ?? internal;
  const setValue = (v: string) => { setInternal(v); onValueChange?.(v); setOpen(false); };
  return <SelectContext.Provider value={{ value: current, setValue, open, setOpen }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectContext)!;
  return (
    <button type="button" onClick={() => ctx.setOpen(!ctx.open)} className={cn("flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50", className)} {...props}>
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="m6 9 6 6 6-6"/></svg>
    </button>
  );
}

export function SelectValue({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) {
  const ctx = React.useContext(SelectContext)!;
  if (children) return <>{children}</>;
  return <span className={ctx.value ? "" : "text-muted-foreground"}>{ctx.value || placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext)!;
  if (!ctx.open) return null;
  return (
    <div className="relative">
      <div className={cn("absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}>
        {children}
      </div>
    </div>
  );
}

export function SelectItem({ value, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(SelectContext)!;
  const selected = ctx.value === value;
  return (
    <div
      onClick={() => ctx.setValue(value)}
      className={cn("relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent", selected && "bg-accent", className)}
      {...props}
    >
      {selected && <span className="absolute right-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
      {children}
    </div>
  );
}
