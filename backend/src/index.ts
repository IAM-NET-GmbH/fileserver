import { createApp } from './app';
import { ProviderService } from './services/ProviderService';
import { CronJob } from 'cron';
import dotenv from 'dotenv';
import { logger, logServer, logProvider } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CHECK_INTERVAL_HOURS = parseInt(process.env.CHECK_INTERVAL_HOURS || '6');

let providerService: ProviderService;

async function startServer() {
  try {
    logServer.starting();
    
    // Create and start Express app
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      logServer.started(Number(PORT));
      logServer.apiReady(Number(PORT));
      logServer.frontendReady(Number(PORT));
    });

    // Initialize provider service
    logProvider.initializing();
    providerService = new ProviderService();
    await providerService.initialize();
    
    // Setup automatic provider checks
    setupAutomaticChecks();

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function setupAutomaticChecks() {
  logProvider.cronSetup(CHECK_INTERVAL_HOURS);
  
  // Run initial check after 1 minute
  setTimeout(async () => {
    logProvider.initialCheck();
    try {
      await providerService.checkAllProviders();
      logProvider.initialCheckComplete();
    } catch (error) {
      logger.error('❌ Initial provider check failed:', error);
    }
  }, 60000); // 1 minute delay

  // Setup recurring checks using cron
  const cronPattern = `0 */${CHECK_INTERVAL_HOURS} * * *`; // Every X hours
  
  const job = new CronJob(cronPattern, async () => {
    logProvider.scheduledCheck();
    try {
      await providerService.checkAllProviders();
      logProvider.scheduledCheckComplete();
    } catch (error) {
      logger.error('❌ Scheduled provider check failed:', error);
    }
  });

  job.start();
  logProvider.cronScheduled(cronPattern);
}

async function gracefulShutdown(server: any) {
  logServer.shutdown();
  
  // Close server
  server.close(async () => {
    logger.info('📡 HTTP server closed');
    
    // Cleanup provider service
    if (providerService) {
      try {
        await providerService.cleanup();
        logger.info('🧹 Provider service cleaned up');
      } catch (error) {
        logger.error('❌ Error during provider cleanup:', error);
      }
    }
    
    logServer.shutdownComplete();
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
