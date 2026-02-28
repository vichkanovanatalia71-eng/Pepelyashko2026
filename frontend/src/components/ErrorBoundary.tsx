import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-center text-4xl">&#x26A0;&#xFE0F;</div>
            <h2 className="mb-2 text-center text-xl font-semibold text-gray-800">
              Щось пішло не так
            </h2>
            <p className="mb-6 text-center text-sm text-gray-500">
              Виникла непередбачена помилка. Спробуйте перезавантажити сторінку.
            </p>
            {this.state.error && (
              <details className="mb-4 rounded bg-gray-100 p-3 text-xs text-gray-600">
                <summary className="cursor-pointer font-medium">
                  Деталі помилки
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Перезавантажити
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
