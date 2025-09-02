import { Menu, Bell, Search, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useStatus, useCheckAllProviders } from '@/hooks/useApi';
import { formatRelativeTime, cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: status } = useStatus();
  const checkAllProviders = useCheckAllProviders();

  const handleRefresh = () => {
    checkAllProviders.mutate();
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
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
        <button className="p-2 rounded-lg hover:bg-gray-100 focus-ring relative">
          <Bell className="w-4 h-4 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-medium text-gray-900">IAM File Server</div>
            <div className="text-xs text-gray-500">fileserver.terhorst.io</div>
          </div>
          
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
            FS
          </div>
        </div>
      </div>
    </header>
  );
}
