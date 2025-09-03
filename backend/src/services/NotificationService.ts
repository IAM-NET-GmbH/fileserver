import { NotificationRepository, Notification, CreateNotificationData } from '../repositories/NotificationRepository';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
  }

  async getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
    return await this.notificationRepository.findByUserId(userId, limit);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.findUnreadByUserId(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.countUnreadByUserId(userId);
  }

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    return await this.notificationRepository.create(data);
  }

  async createForAllAdmins(data: Omit<CreateNotificationData, 'user_id'>): Promise<void> {
    await this.notificationRepository.createForAllAdmins(data);
  }

  async createForAllUsers(data: Omit<CreateNotificationData, 'user_id'>): Promise<void> {
    await this.notificationRepository.createForAllUsers(data);
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    return await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    return await this.notificationRepository.delete(notificationId, userId);
  }

  async cleanupOldNotifications(days = 30): Promise<number> {
    return await this.notificationRepository.deleteOldNotifications(days);
  }

  // Helper methods for common notification types
  async notifyDownloadComplete(userId: string, downloadTitle: string, downloadId: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'success',
      title: 'Download abgeschlossen',
      message: `Der Download "${downloadTitle}" wurde erfolgreich abgeschlossen.`,
      action_url: `/downloads/${downloadId}`
    });
  }

  async notifyDownloadError(userId: string, downloadTitle: string, error: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      type: 'error',
      title: 'Download fehlgeschlagen',
      message: `Der Download "${downloadTitle}" ist fehlgeschlagen: ${error}`
    });
  }

  async notifySystemMaintenance(message: string): Promise<void> {
    await this.createForAllUsers({
      type: 'warning',
      title: 'Systemwartung',
      message
    });
  }

  async notifyNewUserRegistered(newUserName: string, newUserEmail: string): Promise<void> {
    await this.createForAllAdmins({
      type: 'info',
      title: 'Neuer Benutzer registriert',
      message: `${newUserName} (${newUserEmail}) hat sich registriert.`,
      action_url: '/users'
    });
  }

  async notifyProviderStatusChange(providerName: string, status: string): Promise<void> {
    await this.createForAllAdmins({
      type: status === 'online' ? 'success' : 'warning',
      title: 'Provider Status geändert',
      message: `Provider "${providerName}" ist jetzt ${status}.`,
      action_url: '/providers'
    });
  }
}
