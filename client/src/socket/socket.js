import { io } from 'socket.io-client';

/**
 * One shared socket.io-client instance. We control connection lifecycle
 * explicitly (autoConnect false) so the socket connects with a token right
 * after login and disconnects on logout.
 */
const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

/** Connect (or reconnect) carrying the current auth token in the handshake. */
export function connectSocket(token) {
  socket.auth = { token: token || null };
  if (socket.connected) socket.disconnect();
  socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
