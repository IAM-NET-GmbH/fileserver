import { Menu, Bell, Search, RefreshCw, User, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStatus, useCheckAllProviders } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { NotificationDropdown, NotificationBadge } from '@/components/NotificationDropdown';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: status } = useStatus();
  const checkAllProviders = useCheckAllProviders();
  const { user, logout } = useAuth();

  const handleRefresh = () => {
    checkAllProviders.mutate();
  };

  return (
    <header className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-6 shadow-sm">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-ring"
          aria-label="Menu öffnen"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Downloads suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus-ring-inset text-sm"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* System status */}
        {status && (
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Online</span>
            </div>
            <span className="text-gray-400">•</span>
            <span>
              Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
            </span>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={checkAllProviders.isPending}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 focus-ring transition-colors",
            checkAllProviders.isPending && "animate-spin"
          )}
          title="Provider aktualisieren"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-gray-100 focus-ring relative"
            title="Benachrichtigungen"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            <NotificationBadge />
          </button>
          <NotificationDropdown 
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-900">{user?.email || 'IAM File Server'}</div>
            <div className="text-xs text-gray-500">fileserver.terhorst.io</div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium text-sm hover:from-primary-600 hover:to-primary-700 transition-colors focus-ring"
            >
              <User className="w-4 h-4" />
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                
                <div className="py-2">
                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Mein Profil</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
