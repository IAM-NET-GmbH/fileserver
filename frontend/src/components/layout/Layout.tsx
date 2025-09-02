import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';

export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container-wide py-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Connection status indicator */}
      <ConnectionStatus />
    </div>
  );
}
