import { Wifi, WifiOff } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { data: isConnected, isLoading } = useConnectionStatus();

  if (isLoading || isConnected) {
    return null; // Don't show anything when connected or still checking
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg border",
        "bg-red-50 border-red-200 text-red-800"
      )}>
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          Verbindung unterbrochen
        </span>
      </div>
    </div>
  );
}
