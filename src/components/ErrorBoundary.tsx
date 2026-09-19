import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Keystone Error Boundary Caught Exception]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
    } catch (e) {}
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 antialiased">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h1 className="text-lg font-bold text-white mb-2">
              Keystone Operations Engine Recovered
            </h1>
            
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              A temporary runtime error was intercepted. You can reload the application or reset your session state to restore normal operations.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 mb-5 text-left overflow-auto max-h-32 text-[11px] font-mono text-red-400">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload
              </button>
              
              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex-1 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
