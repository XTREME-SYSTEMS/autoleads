import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white p-8 text-black">
          <h1 className="text-2xl font-black text-red-600">Something went wrong</h1>
          <pre className="mt-4 overflow-auto rounded-lg bg-gray-100 p-4 text-sm">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          {this.state.info?.componentStack && (
            <pre className="mt-4 overflow-auto rounded-lg bg-gray-100 p-4 text-xs">
              {this.state.info.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}