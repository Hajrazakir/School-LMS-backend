const http = require('http');
const { Server } = require('socket.io');

const { env, assertRequiredEnv } = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const app = require('./app');
const registerSocketHandlers = require('./sockets');

assertRequiredEnv();

const httpServer = http.createServer(app);

// Real-time layer for parent-teacher chat (Section 3.13) and live
// notifications (Section 3.14), with polling fallback per Section 2.4.
const io = new Server(httpServer, {
  cors: { origin: env.clientUrl, credentials: true },
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io);
app.set('io', io); // lets controllers emit events, e.g. req.app.get('io').to(userId).emit(...)

async function start() {
  await connectDB();

  httpServer.listen(env.port, () => {
    logger.info(`School LMS API running on port ${env.port} [${env.nodeEnv}]`);
  });
}

start();

// --- Graceful shutdown ---
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force-exit if it hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});
