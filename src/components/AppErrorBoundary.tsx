import React from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

const STORAGE_KEY = "junkrunner_save";

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleGlobalError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    if (this.state.error) return;
    const err = event.error instanceof Error ? event.error : new Error(event.message);
    this.setState({ error: err });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (this.state.error) return;
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(String(reason));
    this.setState({ error: err });
  };

  private handleResetSave = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="industrial-panel max-w-lg w-full p-6 rounded-lg">
          <h1 className="font-industrial text-xl text-primary">Crash detected</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This can happen when local save data becomes corrupted. You can reset
            your save to get back in.
          </p>

          <div className="mt-4 flex gap-2">
            <Button variant="steel" className="flex-1" onClick={this.handleRetry}>
              Retry
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={this.handleResetSave}
            >
              Reset Save Data
            </Button>
          </div>

          <details className="mt-4">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              Error details
            </summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
