const app = require('./app');
const config = require('./config/config');
const mongoose = require('mongoose');
const { connectDB } = require('./service/databaseService');
const { logger } = require('./util/logger');

const server = app.listen(config.PORT, () => {
  logger.info('SERVER_STARTED', {
    meta: {
      port: config.PORT,
      env: config.ENV
    }
  });
});

const startup = async () => {
  try {
    await connectDB();
    
    logger.info('APPLICATION_STARTED', {
      meta: {
        port: config.PORT,
        serverUrl: config.SERVER_URL,
        nodeVersion: process.version
      }
    });

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (err) {
    logger.error('APPLICATION_START_FAILED', { 
      meta: {
        error: err.message,
        stack: err.stack 
      }
    });
    gracefulShutdown('startup_failed');
  }
};

const gracefulShutdown = (reason = 'normal') => {
  logger.info('SERVER_SHUTTING_DOWN', { meta: { reason } });
  
  server.close(async (err) => {
    if (err) {
      logger.error('SERVER_SHUTDOWN_ERROR', { meta: err });
      return process.exit(1);
    }

    try {
      await mongoose.connection.close();
      logger.info('DATABASE_DISCONNECTED');
    } catch (dbErr) {
      logger.error('DATABASE_DISCONNECT_ERROR', { meta: dbErr });
    }

    logger.info('SERVER_STOPPED');
    process.exit(0);
  });

  // Force shutdown if takes too long
  setTimeout(() => {
    logger.warn('FORCING_SERVER_SHUTDOWN');
    process.exit(1);
  }, 5000);
};

startup();