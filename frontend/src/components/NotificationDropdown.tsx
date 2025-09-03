import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  X,
  ExternalLink,
  CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

// API functions
const fetchNotifications = async (): Promise<Notification[]> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/notifications', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.notifications;
};

const fetchUnreadCount = async (): Promise<number> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/notifications/unread/count', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data.count;
};

const markAsRead = async (id: string): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
};

const markAllAsRead = async (): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
};

const deleteNotification = async (id: string): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
};

// Notification icon component
const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'success':
      return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
    case 'warning':
      return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />;
    case 'error':
      return <AlertCircle className={cn(iconClass, "text-red-500")} />;
    case 'info':
    case 'system':
    default:
      return <Info className={cn(iconClass, "text-blue-500")} />;
  }
};

// Individual notification component
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDelete }) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Gerade eben';
    if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Min`;
    if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Std`;
    return `vor ${Math.floor(diffInSeconds / 86400)} Tag(en)`;
  };

  const content = (
    <div className={cn(
      "px-4 py-3 hover:bg-gray-50 transition-colors border-l-4",
      !notification.is_read && "bg-blue-50/50",
      notification.type === 'success' && "border-green-400",
      notification.type === 'warning' && "border-yellow-400", 
      notification.type === 'error' && "border-red-400",
      (notification.type === 'info' || notification.type === 'system') && "border-blue-400"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <NotificationIcon type={notification.type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={cn(
                "text-sm font-medium text-gray-900 truncate",
                !notification.is_read && "font-semibold"
              )}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-1 ml-2">
                {!notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Als gelesen markieren"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Löschen"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.created_at)}</p>
          </div>
        </div>
        {notification.action_url && (
          <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 ml-2" />
        )}
      </div>
    </div>
  );

  if (notification.action_url && notification.action_url.startsWith('/')) {
    return (
      <Link to={notification.action_url} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Alle Benachrichtigungen als gelesen markiert');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Benachrichtigung gelöscht');
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Benachrichtigungen
          </h3>
          <div className="flex items-center space-x-2">
            {unreadNotifications.length > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                title="Alle als gelesen markieren"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Alle lesen</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {unreadNotifications.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {unreadNotifications.length} ungelesene Benachrichtigung(en)
          </p>
        )}
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine Benachrichtigungen</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Badge component for notification count
export const NotificationBadge: React.FC = () => {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (unreadCount === 0) return null;

  return (
    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full">
      <span className="sr-only">{unreadCount} ungelesene Benachrichtigungen</span>
    </span>
  );
};
