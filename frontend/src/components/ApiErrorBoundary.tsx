import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ApiError } from '@/lib/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  API-Verbindungsfehler
                </h3>
                <p className="text-sm text-gray-600">
                  Das Backend ist nicht erreichbar
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-medium">
                {this.state.error instanceof ApiError 
                  ? this.state.error.message 
                  : `Unerwarteter Fehler: ${this.state.error.message}`}
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <p><strong>Mögliche Ursachen:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Backend-Server ist nicht gestartet</li>
                <li>Falsche Backend-URL konfiguriert</li>
                <li>Netzwerkverbindungsprobleme</li>
                <li>API-Endpunkt existiert nicht</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Seite neu laden</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
