#!/usr/bin/env node

import { Database } from '../database/database';
import { NotificationService } from '../services/NotificationService';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

async function createTestNotifications() {
  try {
    logger.info('🔔 Creating test notifications...');
    
    // Initialize database
    const database = Database.getInstance();
    await database.initialize();
    
    const notificationService = new NotificationService();
    const userService = new UserService();
    
    // Get all users
    const users = await userService.getAllUsers();
    if (users.length === 0) {
      logger.warn('❌ No users found. Please create users first.');
      return;
    }
    
    const firstUser = users[0];
    logger.info(`📧 Creating notifications for user: ${firstUser.email}`);
    
    // Create various test notifications
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'success',
      title: 'Welcome to the Notification System!',
      message: 'The new notification system is now active. You will receive important updates and information here.',
    });
    
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'info',
      title: 'System Update Available',
      message: 'A new version of the IAM File Server is available. The update can be installed via the settings.',
      action_url: '/settings'
    });
    
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'warning', 
      title: 'Storage Space Running Low',
      message: 'Available storage space is only 15% remaining. Please check your downloads.',
      action_url: '/downloads'
    });
    
    if (firstUser.role === 'admin') {
      await notificationService.createNotification({
        user_id: firstUser.id,
        type: 'system',
        title: 'Backup Successful',
        message: 'The daily backup was successfully created at 02:00. All data has been secured.',
      });
      
      await notificationService.createNotification({
        user_id: firstUser.id,
        type: 'error',
        title: 'Provider Error',
        message: 'Provider "Example Drive" is offline. Automatic downloads are temporarily paused.',
        action_url: '/providers'
      });
    }
    
    logger.info('✅ Test notifications created successfully!');
    logger.info('🎯 Click on the bell in the header to see the notifications.');
    
  } catch (error) {
    logger.error('❌ Error creating test notifications:', error);
  }
  
  process.exit(0);
}

createTestNotifications();
