import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utilities/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    logger.error('Frontend Error Boundary caught an error', {
      message: error.message,
      componentStack: errorInfo.componentStack,
      errorStack: error.stack,
    });
    (this as any).setState({
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-orbit-bg text-[#f0f6fc] p-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-lg mb-8">
            We&apos;re sorry for the inconvenience. Please try refreshing the page or contact support if the issue
            persists.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-left w-full max-w-md overflow-auto">
              <summary className="text-red-300 cursor-pointer">Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-red-200">
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
