import { createApp } from './app';
import { config, validateConfig } from './config/index';
import { closeDatabase } from './database/client';

async function start() {
  try {
    // Validate configuration
    validateConfig();

    // Create and start Fastify app
    const app = await createApp();

    // Start server
    await app.listen({
      port: config.port,
      host: '0.0.0.0', // Listen on all interfaces
    });

    app.log.info(`🚀 Server running at ${config.apiBaseUrl}`);
    app.log.info(`📝 Environment: ${config.nodeEnv}`);
    app.log.info(`🗄️  Database: ${config.databaseUrl.replace(/\/\/.*@/, '//***@')}`); // Hide credentials

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}, closing server...`);

        try {
          await app.close();
          await closeDatabase();
          app.log.info('Server closed successfully');
          process.exit(0);
        } catch (error) {
          app.log.error('Error closing server:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
