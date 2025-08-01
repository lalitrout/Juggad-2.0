// src/lib/socket.js
import { io } from 'socket.io-client';
import { getAuth, onIdTokenChanged } from 'firebase/auth';

// Single shared socket instance
let socket = null;
let currentToken = null;
let connectingPromise = null;

async function getFreshIdToken() {
  const auth = getAuth();
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');
  return u.getIdToken(true);
}

export async function getSocket() {
  // Reuse if already connected
  if (socket && socket.connected) return socket;

  // Avoid parallel connect races
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    currentToken = await getFreshIdToken();

    socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000', {
      transports: ['websocket'],
      auth: { token: currentToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });

    // Refresh auth token on Firebase token change (e.g., hourly)
    const auth = getAuth();
    onIdTokenChanged(auth, async (user) => {
      if (!user) return;
      try {
        const newToken = await user.getIdToken(true);
        currentToken = newToken;
        // update socket auth and reconnect if needed
        if (socket) {
          socket.auth = { token: newToken };
          if (!socket.connected) socket.connect();
        }
      } catch (e) {
        console.warn('Failed to refresh socket token:', e && e.message ? e.message : e);
      }
    });

    // Basic logs (optional)
    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('disconnect', (r) => console.log('[socket] disconnected:', r));
    socket.on('connect_error', (e) => console.warn('[socket] connect_error:', e.message));

    // Wait until actually connected once
    if (socket.connected) return socket;
    await new Promise((res, rej) => {
      const onConnect = () => { cleanup(); res(); };
      const onErr = (e) => { cleanup(); rej(e); };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onErr);
      };
      socket.on('connect', onConnect);
      socket.on('connect_error', onErr);
    });

    return socket;
  })();

  try {
    const s = await connectingPromise;
    return s;
  } finally {
    connectingPromise = null;
  }
}
