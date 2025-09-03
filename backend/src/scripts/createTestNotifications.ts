#!/usr/bin/env node

import { Database } from '../database/database';
import { NotificationService } from '../services/NotificationService';
import { UserService } from '../services/UserService';

async function createTestNotifications() {
  try {
    console.log('🔔 Creating test notifications...');
    
    // Initialize database
    const database = Database.getInstance();
    await database.initialize();
    
    const notificationService = new NotificationService();
    const userService = new UserService();
    
    // Get all users
    const users = await userService.getAllUsers();
    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }
    
    const firstUser = users[0];
    console.log(`📧 Creating notifications for user: ${firstUser.email}`);
    
    // Create various test notifications
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'success',
      title: 'Willkommen zum Benachrichtigungssystem!',
      message: 'Das neue Benachrichtigungssystem ist jetzt aktiv. Sie erhalten hier wichtige Updates und Informationen.',
    });
    
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'info',
      title: 'System Update verfügbar',
      message: 'Eine neue Version des IAM File Servers ist verfügbar. Das Update kann über die Einstellungen installiert werden.',
      action_url: '/settings'
    });
    
    await notificationService.createNotification({
      user_id: firstUser.id,
      type: 'warning', 
      title: 'Speicherplatz wird knapp',
      message: 'Der verfügbare Speicherplatz beträgt nur noch 15%. Bitte überprüfen Sie Ihre Downloads.',
      action_url: '/downloads'
    });
    
    if (firstUser.role === 'admin') {
      await notificationService.createNotification({
        user_id: firstUser.id,
        type: 'system',
        title: 'Backup erfolgreich',
        message: 'Das tägliche Backup wurde erfolgreich um 02:00 Uhr erstellt. Alle Daten sind gesichert.',
      });
      
      await notificationService.createNotification({
        user_id: firstUser.id,
        type: 'error',
        title: 'Provider Fehler',
        message: 'Provider "Example Drive" ist offline. Automatische Downloads sind temporär pausiert.',
        action_url: '/providers'
      });
    }
    
    console.log('✅ Test notifications created successfully!');
    console.log('🎯 Klicken Sie auf die Glocke im Header, um die Benachrichtigungen zu sehen.');
    
  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  }
  
  process.exit(0);
}

createTestNotifications();
