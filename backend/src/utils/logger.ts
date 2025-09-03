import winston from 'winston';

// Create a centralized logger for the backend
export const logger = winston.createLogger({
  level: process.env.DEBUG === 'true' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] [backend]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'backend.log',
      dirname: './logs'
    })
  ]
});

// Helper functions for common log patterns
export const logServer = {
  starting: () => logger.info('🚀 Starting IAM File Server...'),
  started: (port: number) => logger.info(`✅ Server running on port ${port}`),
  apiReady: (port: number) => logger.info(`📡 API available at: http://localhost:${port}/api`),
  frontendReady: (port: number) => logger.info(`🌐 Frontend available at: http://localhost:${port}`),
  shutdown: () => logger.info('👋 Graceful shutdown initiated...'),
  shutdownComplete: () => logger.info('✅ Graceful shutdown completed')
};

export const logProvider = {
  initializing: () => logger.info('🔧 Initializing Provider Service...'),
  constructorCalled: () => logger.info('🏗️ ProviderService constructor called'),
  initStarted: () => logger.info('🔍 Starting ProviderService initialization...'),
  initCompleted: () => logger.info('✅ ProviderService initialization completed'),
  loadingFromDb: () => logger.info('📂 Loading providers from database...'),
  foundProviders: (count: number) => logger.info(`📋 Found ${count} providers in database`),
  loadingEnabled: (id: string) => logger.info(`🔄 Loading enabled provider: ${id}`),
  skippingDisabled: (id: string) => logger.info(`⏸️ Skipping disabled provider: ${id}`),
  loadedActive: (count: number) => logger.info(`📊 Loaded ${count} active providers`),
  scanningFiles: (providerId: string) => logger.info(`🔍 Scanning existing files for provider ${providerId}...`),
  noExistingFiles: (providerId: string) => logger.info(`📋 No existing files found for provider ${providerId}`),
  scanStarted: (providerId: string) => logger.info(`📂 Starting initial scan for provider ${providerId}...`),
  cronSetup: (hours: number) => logger.info(`⏰ Setting up automatic provider checks every ${hours} hours`),
  cronScheduled: (pattern: string) => logger.info(`✅ Cron job scheduled with pattern: ${pattern}`),
  initialCheck: () => logger.info('🔍 Running initial provider check...'),
  initialCheckComplete: () => logger.info('✅ Initial provider check completed'),
  scheduledCheck: () => logger.info('🔄 Running scheduled provider check...'),
  scheduledCheckComplete: () => logger.info('✅ Scheduled provider check completed')
};
