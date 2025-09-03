import { Database } from '../database/database';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export interface CreateNotificationData {
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  action_url?: string;
}

export class NotificationRepository {
  public knex: Knex;

  constructor() {
    this.knex = Database.getInstance().getKnex();
  }

  async findByUserId(userId: string, limit = 20): Promise<Notification[]> {
    const notifications = await this.knex('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
    
    return notifications.map(this.mapNotification);
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const notifications = await this.knex('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .orderBy('created_at', 'desc');
    
    return notifications.map(this.mapNotification);
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.knex('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('id as count')
      .first();
    return result?.count as number || 0;
  }

  async create(notificationData: CreateNotificationData): Promise<Notification> {
    const id = uuidv4();
    
    const notificationToInsert = {
      id,
      user_id: notificationData.user_id,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      action_url: notificationData.action_url || null,
      is_read: false,
      created_at: new Date()
    };

    await this.knex('notifications').insert(notificationToInsert);
    
    const createdNotification = await this.knex('notifications')
      .where('id', id)
      .first();
    
    return this.mapNotification(createdNotification);
  }

  async createForAllAdmins(data: Omit<CreateNotificationData, 'user_id'>): Promise<void> {
    // Get all admin users
    const admins = await this.knex('users')
      .select('id')
      .where('role', 'admin')
      .where('is_active', true);

    // Create notification for each admin
    const notifications = admins.map(admin => ({
      id: uuidv4(),
      user_id: admin.id,
      type: data.type,
      title: data.title,
      message: data.message,
      action_url: data.action_url || null,
      is_read: false,
      created_at: new Date()
    }));

    if (notifications.length > 0) {
      await this.knex('notifications').insert(notifications);
    }
  }

  async createForAllUsers(data: Omit<CreateNotificationData, 'user_id'>): Promise<void> {
    // Get all active users
    const users = await this.knex('users')
      .select('id')
      .where('is_active', true);

    // Create notification for each user
    const notifications = users.map(user => ({
      id: uuidv4(),
      user_id: user.id,
      type: data.type,
      title: data.title,
      message: data.message,
      action_url: data.action_url || null,
      is_read: false,
      created_at: new Date()
    }));

    if (notifications.length > 0) {
      await this.knex('notifications').insert(notifications);
    }
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const updatedCount = await this.knex('notifications')
      .where('id', id)
      .where('user_id', userId)
      .update({
        is_read: true,
        read_at: new Date()
      });

    return updatedCount > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const updatedCount = await this.knex('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date()
      });

    return updatedCount;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deletedCount = await this.knex('notifications')
      .where('id', id)
      .where('user_id', userId)
      .del();

    return deletedCount > 0;
  }

  async deleteOldNotifications(days = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedCount = await this.knex('notifications')
      .where('created_at', '<', cutoffDate)
      .where('is_read', true)
      .del();

    return deletedCount;
  }

  private mapNotification(notification: any): Notification {
    return {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      action_url: notification.action_url,
      is_read: Boolean(notification.is_read),
      created_at: new Date(notification.created_at),
      read_at: notification.read_at ? new Date(notification.read_at) : undefined
    };
  }
}
