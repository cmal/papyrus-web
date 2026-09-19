import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
  return ctx;
}

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) {
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props.onClick?.(e);
        setOpen(true);
      },
    });
  }
  return <button onClick={() => setOpen(true)} {...props}>{children}</button>;
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen } = useDialog();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div
        className={cn(
          "relative z-50 max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg border bg-background p-4 shadow-lg sm:max-h-[85vh] sm:p-6",
          className,
        )}
      >
        {children}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm p-1 opacity-70 hover:opacity-100 sm:right-4 sm:top-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
