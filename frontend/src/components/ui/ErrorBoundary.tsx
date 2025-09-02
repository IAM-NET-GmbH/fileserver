import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Error Icon */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              
              {/* Error Message */}
              <div className="mt-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Ups! Etwas ist schiefgelaufen
                </h1>
                <p className="mt-2 text-gray-600">
                  Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.
                </p>
              </div>

              {/* Error Details (Development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mt-6 text-left">
                  <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <summary className="font-medium text-red-800 cursor-pointer hover:text-red-900">
                      Fehlerdetails anzeigen
                    </summary>
                    <div className="mt-3 text-sm text-red-700">
                      <p className="font-mono bg-red-100 p-2 rounded border text-xs overflow-x-auto">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="mt-2 text-xs bg-red-100 p-2 rounded border overflow-x-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex-1 btn-primary flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Seite neu laden</span>
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Zur Startseite</span>
                </button>
              </div>

              {/* Support Information */}
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Problem weiterhin bestehen?
                </h3>
                <p className="text-sm text-gray-600">
                  Kontaktieren Sie den Administrator oder prüfen Sie die Systemlogs für weitere Informationen.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
