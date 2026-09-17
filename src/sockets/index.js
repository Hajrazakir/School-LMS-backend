const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../utils/logger');

/**
 * Socket.IO handlers for real-time features:
 * - Parent-Teacher Chat (Section 3.13): message delivery, read receipts, typing/online status
 * - Live Notifications (Section 3.14): push in-app notifications instantly
 *
 * Each authenticated socket joins a personal room named after the user's
 * ID, so controllers elsewhere can do `io.to(userId).emit('notification', ...)`
 * without tracking socket IDs manually.
 */
function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication token missing'));

      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.userId); // personal room for direct notifications
    logger.debug(`Socket connected: user=${socket.userId} role=${socket.userRole}`);

    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Actual message persistence happens via the REST API (chat controller,
    // not yet implemented) which then emits to this room server-side -
    // this keeps a single source of truth in MongoDB rather than trusting
    // client-emitted message content directly.
    socket.on('conversation:typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
        userId: socket.userId,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user=${socket.userId}`);
    });
  });
}

module.exports = registerSocketHandlers;
