import { createApp } from './app';
import { ProviderService } from './services/ProviderService';
import { CronJob } from 'cron';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CHECK_INTERVAL_HOURS = parseInt(process.env.CHECK_INTERVAL_HOURS || '6');

let providerService: ProviderService;

async function startServer() {
  try {
    console.log('🚀 Starting IAM File Server...');
    
    // Create and start Express app
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API available at: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend available at: http://localhost:${PORT}`);
    });

    // Initialize provider service
    console.log('🔧 Initializing Provider Service...');
    providerService = new ProviderService();
    await providerService.initialize();
    
    // Setup automatic provider checks
    setupAutomaticChecks();

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function setupAutomaticChecks() {
  console.log(`⏰ Setting up automatic provider checks every ${CHECK_INTERVAL_HOURS} hours`);
  
  // Run initial check after 1 minute
  setTimeout(async () => {
    console.log('🔍 Running initial provider check...');
    try {
      await providerService.checkAllProviders();
      console.log('✅ Initial provider check completed');
    } catch (error) {
      console.error('❌ Initial provider check failed:', error);
    }
  }, 60000); // 1 minute delay

  // Setup recurring checks using cron
  const cronPattern = `0 */${CHECK_INTERVAL_HOURS} * * *`; // Every X hours
  
  const job = new CronJob(cronPattern, async () => {
    console.log('🔄 Running scheduled provider check...');
    try {
      await providerService.checkAllProviders();
      console.log('✅ Scheduled provider check completed');
    } catch (error) {
      console.error('❌ Scheduled provider check failed:', error);
    }
  });

  job.start();
  console.log(`✅ Cron job scheduled with pattern: ${cronPattern}`);
}

async function gracefulShutdown(server: any) {
  console.log('\n👋 Graceful shutdown initiated...');
  
  // Close server
  server.close(async () => {
    console.log('📡 HTTP server closed');
    
    // Cleanup provider service
    if (providerService) {
      try {
        await providerService.cleanup();
        console.log('🧹 Provider service cleaned up');
      } catch (error) {
        console.error('❌ Error during provider cleanup:', error);
      }
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
