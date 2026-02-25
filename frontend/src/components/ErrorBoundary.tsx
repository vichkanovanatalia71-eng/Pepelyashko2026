import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-700 flex items-center justify-center px-4">
          <div className="card-neo p-8 max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={30} className="text-red-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white mb-2">Щось пішло не так</h1>
              <p className="text-sm text-gray-400">
                Виникла непередбачена помилка. Спробуйте оновити сторінку.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-dark-400/40 border border-dark-50/10 text-left">
                <p className="text-xs text-gray-500 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dark-400/50 border border-dark-50/15 text-gray-300 text-sm font-medium hover:bg-dark-400/80 transition-all"
              >
                <RefreshCw size={14} />
                Спробувати знову
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-sm font-medium hover:bg-accent-500/20 transition-all"
              >
                Перезавантажити
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
