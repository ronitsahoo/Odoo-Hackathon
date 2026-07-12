import { useEffect } from 'react';
import { socket } from '../socket/socket.js';

/**
 * Subscribe to a socket event for the lifetime of a component.
 * Handlers are re-bound when `deps` change and always cleaned up on unmount.
 *
 * Usage:
 *   useSocket('item:created', (item) => addItem(item));
 */
export function useSocket(event, handler, deps = []) {
  useEffect(() => {
    socket.on(event, handler);
    return () => socket.off(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Join a per-item room while a detail page is mounted (for live comment
 * threads), leaving it automatically on unmount.
 */
export function useItemRoom(itemId) {
  useEffect(() => {
    if (!itemId) return;
    socket.emit('item:join', itemId);
    return () => socket.emit('item:leave', itemId);
  }, [itemId]);
}
