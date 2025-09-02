import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
              <FileQuestion className="w-16 h-16 text-primary-600" />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-4 -left-4 w-3 h-3 bg-green-400 rounded-full animate-bounce delay-500"></div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Seite nicht gefunden
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Die Seite, die Sie suchen, existiert nicht oder wurde verschoben. 
            Überprüfen Sie die URL oder kehren Sie zur Startseite zurück.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Zur Startseite</span>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Vielleicht suchen Sie nach:
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              to="/downloads"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Downloads
            </Link>
            <Link
              to="/providers"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Provider
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Einstellungen
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Bei anhaltenden Problemen kontaktieren Sie den Administrator
          </p>
        </div>
      </div>
    </div>
  );
}
