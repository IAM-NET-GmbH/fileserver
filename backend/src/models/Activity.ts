export interface Activity {
  id: string;
  type: 'download' | 'provider_check' | 'system' | 'auth';
  action: string;
  details?: string;
  providerId?: string;
  downloadId?: string;
  status: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ActivityLogger {
  private static activities: Activity[] = [];
  private static maxActivities = 50;

  static log(activity: Omit<Activity, 'id' | 'timestamp'>): void {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    this.activities.unshift(newActivity);
    
    // Keep only the latest activities
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }
  }

  static getRecent(limit: number = 10): Activity[] {
    return this.activities.slice(0, limit);
  }

  static getAll(): Activity[] {
    return [...this.activities];
  }

  static clear(): void {
    this.activities = [];
  }

  // Helper methods for common activities
  static logDownload(providerId: string, downloadTitle: string, status: 'success' | 'error', downloadId?: string): void {
    this.log({
      type: 'download',
      action: `Download: ${downloadTitle}`,
      providerId,
      downloadId,
      status,
      details: status === 'success' ? 'Download erfolgreich abgeschlossen' : 'Download fehlgeschlagen'
    });
  }

  static logProviderCheck(providerId: string, providerName: string, status: 'success' | 'error'): void {
    this.log({
      type: 'provider_check',
      action: `Provider "${providerName}" überprüft`,
      providerId,
      status,
      details: status === 'success' ? 'Überprüfung erfolgreich' : 'Überprüfung fehlgeschlagen'
    });
  }

  static logSystemEvent(action: string, status: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.log({
      type: 'system',
      action,
      status
    });
  }

  static logAuth(action: string, status: 'success' | 'error' | 'info', details?: string): void {
    this.log({
      type: 'auth',
      action,
      status,
      details
    });
  }
}
