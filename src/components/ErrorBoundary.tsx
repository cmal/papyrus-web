import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Remounts the boundary (clearing the error) whenever this changes — pass route/location key. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Without a boundary, one unrenderable row (see lib/labels.ts for a real example) unmounts the
 * entire React tree and the user gets a blank page with nothing but a console trace. This keeps
 * the failure contained to the routed page and makes the underlying error visible in the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page render failed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle size={28} className="text-destructive" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">This page failed to render</h3>
        <p className="mb-4 max-w-lg text-sm text-muted-foreground">
          The rest of the app still works — pick another page from the sidebar, or retry.
        </p>
        <pre className="mb-4 max-w-2xl overflow-auto rounded-md bg-muted px-3 py-2 text-left text-xs text-destructive">
          {error.message}
        </pre>
        <Button size="sm" onClick={() => this.setState({ error: null })}>Retry</Button>
      </div>
    );
  }
}
