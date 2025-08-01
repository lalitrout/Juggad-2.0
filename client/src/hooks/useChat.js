// src/hooks/useChat.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getSocket } from '../lib/socket';

/**
 * useChat(chatId, options)
 * options: {
 *   participants?: string[] (exactly two UIDs) -> auto-create /chats/{chatId} if missing
 *   taskId?: string | null
 *   pageSize?: number
 *   useSocket?: boolean
 * }
 */
export function useChat(chatId, options = {}) {
  const {
    participants = [],
    taskId = null,
    pageSize = 500,
    useSocket = true,
  } = options;

  const auth = getAuth();
  const myUid = auth.currentUser?.uid || null;

  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  const chatDocRef = useMemo(() => {
    if (!chatId) return null;
    return doc(db, 'chats', chatId);
  }, [chatId]);

  // Ensure parent /chats/{chatId} exists (needed for rules)
  const ensureChatDoc = useCallback(async () => {
    if (!chatDocRef || !myUid) return;
    const snap = await getDoc(chatDocRef);
    if (!snap.exists()) {
      if (!participants || participants.length !== 2) return;
      const unique = Array.from(new Set(participants.filter(Boolean)));
      if (unique.length !== 2 || !unique.includes(myUid)) return;

      await setDoc(
        chatDocRef,
        {
          participants: unique,
          taskId: taskId ?? null,
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }, [chatDocRef, myUid, participants, taskId]);

  // Live subscription to messages
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        await ensureChatDoc();
      } catch (e) {
        console.warn('ensureChatDoc error:', e?.message || e);
      }

      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(pageSize)
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          const list = [];
          snap.forEach((d) => {
            const m = d.data();
            list.push({
              id: d.id,
              text: m.text,
              type: m.type || 'text',
              senderUid: m.senderUid,
              senderName: m.senderName ?? null,
              createdAt: m.createdAt,
              status: m.status || 'sent',
            });
          });
          setMessages(list);
          setLoading(false);
        },
        (err) => {
          console.error('[chat:onSnapshot] error', err);
          setError(err.message || 'Failed to load messages');
          setLoading(false);
        }
      );
    })();

    return () => unsub();
  }, [chatId, pageSize, ensureChatDoc]);

  // Socket join + typing presence (optional)
  useEffect(() => {
    if (!useSocket) return;
    let active = true;
    (async () => {
      if (!chatId) return;
      const s = await getSocket();
      if (!active) return;
      socketRef.current = s;

      const onJoined = () => {};
      const onTyping = ({ uid, isTyping }) => {
        if (uid !== myUid) setTyping(!!isTyping);
      };
      const onError = (e) => console.warn('[socket chat:error]', e);

      s.emit('chat:join', { chatId }); // use chatId in payload
      s.on('chat:joined', onJoined);
      s.on('chat:typing', onTyping);
      s.on('chat:error', onError);

      return () => {
        s.off('chat:joined', onJoined);
        s.off('chat:typing', onTyping);
        s.off('chat:error', onError);
      };
    })();

    return () => {
      active = false;
    };
  }, [chatId, myUid, useSocket]);

  // Send message — write directly to Firestore
  const sendMessage = useCallback(
    async (text, type = 'text') => {
      if (!text?.trim() || !chatId || !myUid) return;

      await ensureChatDoc();

      const msgCol = collection(db, 'chats', chatId, 'messages');
      await addDoc(msgCol, {
        text: text.trim(),
        type,
        senderUid: myUid,
        senderName: auth.currentUser?.displayName || null,
        createdAt: serverTimestamp(),
        status: 'sent',
      });

      if (chatDocRef) {
        await updateDoc(chatDocRef, {
          lastMessage: text.trim(),
          lastMessageAt: serverTimestamp(),
        });
      }
    },
    [chatId, myUid, chatDocRef, ensureChatDoc]
  );

  // Local typing + optional broadcast over socket
  const setIsTypingSafe = useCallback(
    async (isTyping) => {
      setTyping(!!isTyping);
      if (!useSocket) return;
      if (!chatId) return;
      const s = socketRef.current || (await getSocket());
      s.emit('chat:typing', { chatId, isTyping: !!isTyping });
    },
    [chatId, useSocket]
  );

  return {
    messages,
    typing,
    loading,
    error,
    sendMessage,
    setIsTyping: setIsTypingSafe,
    myUid,
  };
}
