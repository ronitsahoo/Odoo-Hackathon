import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Socket.io wiring. We keep a module-level `io` reference so plain controllers
 * can emit without threading `io` through every function call.
 *
 * Rooms:
 *   - `items`        : everyone browsing; receives item:created/updated/deleted
 *                      and comment:created for live lists & threads.
 *   - `item:<id>`    : viewers of a single item's detail page.
 *   - `user:<id>`    : a private room per authenticated user for targeted
 *                      notifications (request updates, admin broadcasts).
 */
let io = null;

export function initSockets(server, corsOrigin) {
  // Lazy import so this file has no hard dependency order with index.js.
  return import('socket.io').then(({ Server }) => {
    io = new Server(server, {
      cors: { origin: corsOrigin, credentials: true },
    });

    // Authenticate the socket handshake (token passed in auth payload).
    // Connections without a valid token are still allowed as guests so the
    // public Home page gets live item updates — they just don't join user:<id>.
    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(); // guest socket
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.id).select('_id role isBanned');
        if (user && !user.isBanned) {
          socket.userId = user._id.toString();
          socket.role = user.role;
        }
      } catch {
        // Invalid token -> treat as guest.
      }
      next();
    });

    io.on('connection', (socket) => {
      // Everyone watches the shared items feed.
      socket.join('items');

      // Everyone watches the shared assets feed (Module 3).
      socket.join('assets');

      // Authenticated users get their private notification room.
      if (socket.userId) socket.join(`user:${socket.userId}`);

      // Detail pages join/leave a per-item room for live comment threads.
      socket.on('item:join', (itemId) => itemId && socket.join(`item:${itemId}`));
      socket.on('item:leave', (itemId) => itemId && socket.leave(`item:${itemId}`));

      socket.on('disconnect', () => {
        /* rooms are cleaned up automatically */
      });
    });

    return io;
  });
}

/** Accessor used by controllers. Throws if sockets weren't initialized. */
export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// --- Named emit helpers so controllers read clearly ------------------------

export const emitItemCreated = (item) => getIO().to('items').emit('item:created', item);
export const emitItemUpdated = (item) => {
  getIO().to('items').emit('item:updated', item);
  getIO().to(`item:${item._id}`).emit('item:updated', item);
};
export const emitItemDeleted = (itemId) =>
  getIO().to('items').emit('item:deleted', { id: itemId.toString() });

export const emitCommentCreated = (comment) =>
  getIO().to(`item:${comment.item}`).emit('comment:created', comment);
export const emitCommentUpdated = (comment) =>
  getIO().to(`item:${comment.item}`).emit('comment:updated', comment);

/** Push a notification to a single user's private room. */
export const emitNotification = (userId, notification) =>
  getIO().to(`user:${userId}`).emit('notification:new', notification);

// --- Asset emit helpers (Module 3) ---
export const emitAssetCreated = (asset) => getIO().to('assets').emit('asset:created', asset);
export const emitAssetUpdated = (asset) => getIO().to('assets').emit('asset:updated', asset);
export const emitAssetDeleted = (assetId) =>
  getIO().to('assets').emit('asset:deleted', { id: assetId.toString() });
