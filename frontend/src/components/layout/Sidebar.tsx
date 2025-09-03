import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Download,
  Settings2,
  Server,
  Users,
  Key,
  Activity,
  HardDrive
} from 'lucide-react';
import { useProviders, useDownloadStats } from '@/hooks/useApi';
import { cn, formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const getNavigationItems = (userRole?: 'user' | 'admin') => [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    current: false,
    adminOnly: false,
  },
  {
    name: 'Downloads',
    href: '/downloads',
    icon: Download,
    current: false,
    adminOnly: false,
  },
  {
    name: 'Provider',
    href: '/providers',
    icon: Server,
    current: false,
    adminOnly: true,
  },
  {
    name: 'Benutzerverwaltung',
    href: '/users',
    icon: Users,
    current: false,
    adminOnly: true,
  },
  {
    name: 'API Tokens',
    href: '/tokens',
    icon: Key,
    current: false,
    adminOnly: true,
  },
  {
    name: 'Einstellungen',
    href: '/settings',
    icon: Settings2,
    current: false,
    adminOnly: true,
  },
].filter(item => !item.adminOnly || userRole === 'admin');

export function Sidebar() {
  const { data: providers } = useProviders();
  const { data: downloadStats } = useDownloadStats();
  const { user } = useAuth();

  const navigationItems = getNavigationItems(user?.role);
  const activeProviders = providers?.filter(p => p.enabled && p.status === 'active').length || 0;
  const totalDownloads = downloadStats?.totalDownloads || 0;

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center h-12 flex-shrink-0 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <HardDrive className="w-2 h-2 text-white" />
            </div>
            <div>
              <h1 className="text-normal font-semibold text-gray-900">IAM-NET - Fileserver</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700 border-r-2 border-primary-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )
                  }
                >
                  <Icon
                    className="mr-3 flex-shrink-0 h-5 w-5"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Stats */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Aktive Provider</span>
                <span className="font-medium text-gray-900">{activeProviders}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Downloads</span>
                <span className="font-medium text-gray-900">
                  {formatNumber(totalDownloads)}
                </span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs font-medium text-gray-600">System Online</span>
            </div>
            <div className="mt-2">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Activity className="w-3 h-3" />
                <span>Monitoring aktiv</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>IAM-NET.eu - File Server v1.0.0</p>
            <p className="mt-1">Maintained by <a href="https://linkedin.com/in/niklas-terhorst" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">Niklas Terhorst</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
