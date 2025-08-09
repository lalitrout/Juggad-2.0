// index.js (ESM)
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import profilePhotoRoute from "./profilePhotoRoute.js";
import admin from './firebaseAdmin.js'; // your firebase-admin initializer


const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost:5173'], // add more origins as needed
    credentials: true,
  })
);

// ---------- (Optional) Dev check: ensure serviceAuth.json exists if no env ----------
if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !process.env.FIREBASE_SERVICE_ACCOUNT &&
  !fs.existsSync('./serviceAuth.json')
) {
  console.warn(
    'Warning: No Firebase Admin credentials detected. For local dev, put serviceAuth.json next to index.js or set env vars.'
  );
}

// ---------- Basic routes (unchanged) ----------
app.get('/', (_req, res) => res.send('Backend is working!'));

app.use('/api/profile', profilePhotoRoute);

app.post('/sessionLogin', async (req, res) => {
  const { idToken } = req.body;
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    res.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: false, // set true behind HTTPS in production
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).send({ message: 'Session cookie created' });
  } catch (error) {
    console.error('Error creating session cookie:', error);
    res.status(401).send('UNAUTHORIZED REQUEST');
  }
});

app.get('/auth-status', async (req, res) => {
  const sessionCookie = req.cookies.session || '';
  try {
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    const user = await admin.auth().getUser(decoded.uid);
    res.status(200).send({ uid: user.uid, email: user.email });
  } catch (err) {
    console.error('Session invalid:', err);
    res.status(401).send({ message: 'Unauthorized' });
  }
});

app.get('/membership', (_req, res) => res.status(200).send({ isMember: true }));

app.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.status(200).send({ message: 'Logged out' });
});

// ---------- HTTP + Socket.IO ----------
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// --- Helpers ---
/** Accept both payload.chatId and payload.taskId; prefer chatId. */
function normalizeId(payload = {}) {
  const id = (payload.chatId ?? payload.taskId ?? '').toString().trim();
  return id || null;
}

/** Fetch participants from /chats/{chatId}, or fall back to /tasks/{chatId}. */
async function getParticipants(chatId) {
  // Try chats first
  const chatSnap = await db.collection('chats').doc(chatId).get();
  if (chatSnap.exists) {
    const c = chatSnap.data() || {};
    if (Array.isArray(c.participants) && c.participants.length === 2) {
      return { participants: c.participants, from: 'chats' };
    }
  }
  // Fallback to tasks (when chatId === taskId)
  const taskSnap = await db.collection('tasks').doc(chatId).get();
  if (taskSnap.exists) {
    const t = taskSnap.data() || {};
    const a = t?.postedBy || null;
    const b = t?.acceptedBy?.uid || null;
    const list = [a, b].filter(Boolean);
    if (list.length === 2) {
      return { participants: list, from: 'tasks' };
    }
  }
  return { participants: null, from: null };
}

/** Ensure /chats/{chatId} exists with participants and preview fields. */
async function ensureChatDoc(chatId, participants, taskId = null) {
  const chatRef = db.collection('chats').doc(chatId);
  const snap = await chatRef.get();
  if (!snap.exists) {
    await chatRef.set(
      {
        participants,
        taskId: taskId ?? chatId,
        lastMessage: '',
        lastMessageAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

/** Authorization: uid must be in participants array. */
function isParticipant(uid, participants) {
  return !!uid && Array.isArray(participants) && participants.includes(uid);
}

// --- Socket.IO auth middleware ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) throw new Error('Missing ID token');
    const decoded = await admin.auth().verifyIdToken(token);

    socket.data.uid = decoded.uid;
    socket.data.name = decoded.name || decoded.email || 'Member';

    next();
  } catch (err) {
    console.error('❌ Socket auth error:', err.message);
    next(new Error('Unauthorized'));
  }
});

// --- Socket.IO handlers ---
io.on('connection', (socket) => {
  const { uid } = socket.data;
  console.log(' Socket connected:', socket.id, 'uid:', uid);

  // JOIN a chat room
  socket.on('chat:join', async (payload = {}) => {
    try {
      const chatId = normalizeId(payload);
      console.log('  chat:join payload:', payload, '→ chatId:', chatId);

      if (!chatId) {
        return socket.emit('chat:error', { message: 'chatId is required for chat:join' });
      }

      // Resolve participants either from chats or tasks
      const { participants, from } = await getParticipants(chatId);
      if (!participants) {
        return socket.emit('chat:error', { message: 'Chat/Task not found for this id' });
      }

      // If we only found them on tasks, ensure the chats doc exists now
      if (from === 'tasks') {
        await ensureChatDoc(chatId, participants, chatId);
      }

      if (!isParticipant(uid, participants)) {
        return socket.emit('chat:error', { message: 'Not allowed for this chat' });
      }

      socket.join(`chat:${chatId}`);
      socket.emit('chat:joined', { chatId });
    } catch (e) {
      console.warn('[socket] chat:join error', e);
      socket.emit('chat:error', { message: e?.message || 'join failed' });
    }
  });

  // TYPING indicator relay
  socket.on('chat:typing', async (payload = {}) => {
    try {
      const chatId = normalizeId(payload);
      if (!chatId) {
        return socket.emit('chat:error', { message: 'chatId is required for chat:typing' });
      }
      const { participants } = await getParticipants(chatId);
      if (!participants || !isParticipant(uid, participants)) {
        return socket.emit('chat:error', { message: 'Not allowed for this chat' });
      }
      socket.to(`chat:${chatId}`).emit('chat:typing', { uid, isTyping: !!payload.isTyping });
    } catch (e) {
      console.warn('[socket] chat:typing error', e);
      socket.emit('chat:error', { message: e?.message || 'typing failed' });
    }
  });

  // OPTIONAL: If you want the server to persist messages instead of the client,
  // uncomment this block and make sure the client emits `chat:message`.
  /*
  socket.on('chat:message', async (payload = {}) => {
    try {
      const chatId = normalizeId(payload);
      const text = (payload.text || '').toString().trim();

      console.log('➡️  chat:message', { chatId, textLen: text.length });

      if (!chatId) {
        return socket.emit('chat:error', { message: 'chatId is required for chat:message' });
      }
      if (!text) return; // ignore empty

      const { participants } = await getParticipants(chatId);
      if (!participants || !isParticipant(uid, participants)) {
        return socket.emit('chat:error', { message: 'Not allowed for this chat' });
      }

      await ensureChatDoc(chatId, participants, chatId);

      const chatRef = db.collection('chats').doc(chatId);
      const msgRef = chatRef.collection('messages').doc();

      const message = {
        text,
        type: 'text',
        senderUid: uid,
        senderName: socket.data.name || null,
        createdAt: FieldValue.serverTimestamp(),
        status: 'sent',
      };

      await msgRef.set(message);

      await chatRef.set(
        { lastMessage: text, lastMessageAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      io.to(`chat:${chatId}`).emit('chat:new', {
        id: msgRef.id,
        ...message,
        createdAt: Date.now(), // immediate UI; Firestore snapshot will reconcile
      });
    } catch (e) {
      console.error('[socket] chat:message error', e);
      socket.emit('chat:error', { message: e?.message || 'send failed' });
    }
  });
  */

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
