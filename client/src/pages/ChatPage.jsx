import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Paperclip, Image, Star } from "lucide-react";
import NavHeader from "../components/Header";
import { useChat } from "../hooks/useChat";
import {
  setDoc,
  addDoc,
  doc,
  collection,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

function initials(name = "Member") {
  return name
    .trim()
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(ts) {
  try {
    const d =
      ts?.toDate?.() instanceof Date
        ? ts.toDate()
        : ts instanceof Date
        ? ts
        : typeof ts === "string"
        ? new Date(ts)
        : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const ChatPage = ({ navigateTo, chatId, theme, toggleTheme, isLoggedIn }) => {
  const auth = getAuth();
  const myUid = auth.currentUser?.uid || null;

  const [message, setMessage] = useState("");
  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(true);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const inputWrapperRef = useRef(null);
  const profileHeaderRef = useRef(null);

  const participants = useMemo(() => {
    if (!task) return [];
    const posterUid = task?.postedBy || null;
    const acceptedUid = task?.acceptedBy?.uid || null;
    return [posterUid, acceptedUid].filter(Boolean);
  }, [task]);

  const { messages, typing, sendMessage, setIsTyping } = useChat(chatId, {
    participants,
    taskId: chatId,
    useSocket: true,
    pageSize: 500,
  });

  useEffect(() => {
    if (!chatId) {
      setTask(null);
      setLoadingTask(false);
      return;
    }
    setLoadingTask(true);
    const ref = doc(db, "tasks", chatId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setTask({ id: snap.id, ...snap.data() });
        } else {
          setTask(null);
        }
        setLoadingTask(false);
      },
      () => setLoadingTask(false)
    );
    return () => unsub();
  }, [chatId]);

  // ---- Avatar logic based on Firestore structure
  let headerName = "User";
  let photoURL = null;
  let headerRating = 4.8;
  if (task && myUid) {
    if (task.postedBy === myUid) {
      headerName = task.acceptedBy?.name || "User";
      photoURL = task.acceptedBy?.photoURL || null;
      headerRating = 4.8; // You can add acceptedBy.rating if available
    } else if (task.acceptedBy?.uid === myUid) {
      headerName = task.postedByName || "User";
      photoURL = task.postedByPhotoURL || null;
      headerRating = 4.8; // You can add poster.rating if available
    }
  }
  const avatarLetter = headerName[0]?.toUpperCase() || "U";
  const headerAvatar = photoURL ? (
    <img
      src={photoURL}
      alt={headerName}
      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-300 dark:border-blue-800 shadow"
    />
  ) : (
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow">
      {avatarLetter}
    </div>
  );

  useEffect(() => {
    const t = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const inputWrapper = inputWrapperRef.current;
    const messagesContainer = document.querySelector(".messages-container");

    const handleResize = () => {
      if (inputWrapper && messagesContainer) {
        const visualViewport = window.visualViewport;
        let keyboardHeight = 0;

        if (visualViewport) {
          keyboardHeight = Math.max(
            0,
            window.innerHeight - visualViewport.height
          );
          inputWrapper.style.position = "fixed";
          inputWrapper.style.bottom = `${keyboardHeight}px`;
          inputWrapper.style.left = "0";
          inputWrapper.style.right = "0";
          inputWrapper.style.zIndex = "40";
          messagesContainer.style.paddingBottom = `${
            keyboardHeight + inputWrapper.offsetHeight + 80
          }px`;
        } else {
          inputWrapper.style.position = "fixed";
          inputWrapper.style.bottom = "0";
          inputWrapper.style.left = "0";
          inputWrapper.style.right = "0";
          inputWrapper.style.zIndex = "40";
          messagesContainer.style.paddingBottom = `${
            Math.max(inputWrapper.offsetHeight, 80) + 80
          }px`;
        }

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 60);
      }
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("focusin", handleResize);
    window.addEventListener("focusout", handleResize);

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("focusin", handleResize);
      window.removeEventListener("focusout", handleResize);
      if (messagesContainer) messagesContainer.style.paddingBottom = "";
    };
  }, []);

  useEffect(() => {
    const profileHeader = profileHeaderRef.current;
    const taskContext = document.querySelector(".task-context");
    if (profileHeader && taskContext) {
      taskContext.style.top = `${profileHeader.offsetHeight}px`;
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    const auth = getAuth();
    const currentUserUid = auth.currentUser.uid;
    const participants = [task?.postedBy, task?.acceptedBy?.uid].filter(Boolean);

    await setDoc(
      doc(db, "chats", chatId),
      {
        participants,
        createdAt: serverTimestamp(),
        lastMessage: message.trim(),
        lastMessageAt: serverTimestamp(),
        taskId: chatId,
      },
      { merge: true }
    );

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: message.trim(),
      senderUid: currentUserUid,
      createdAt: serverTimestamp(),
    });

    setMessage("");
    setTimeout(() => messageInputRef.current?.focus(), 10);
  };

  if (!chatId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <NavHeader
          showNav={false}
          navigateTo={navigateTo}
          currentPage="chat"
          theme={theme}
          toggleTheme={toggleTheme}
          isLoggedIn={isLoggedIn}
        />
        <main className="max-w-3xl mx-auto py-10 px-4">
          <button
            onClick={() => navigateTo("home")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-4"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Messages
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Open a task and tap <b>Message</b> to start a conversation with
              the other participant.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      {/* Sticky Chat Profile Header */}
      <div
        ref={profileHeaderRef}
        className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 z-30 pt-[env(safe-area-inset-top, 0px)] sm:px-4 sm:py-3"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              if (chatId) {
                navigateTo("task", { taskId: chatId });
              } else {
                navigateTo("home");
              }
            }}
            className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Back to chat list"
          >
            <ArrowLeft
              size={18}
              className="text-gray-600 dark:text-gray-300 sm:w-5 sm:h-5"
            />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-200 dark:bg-emerald-700 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
                  {headerAvatar}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border border-white dark:border-gray-800" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                {headerName}
              </h3>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <Star
                  size={10}
                  className="text-yellow-400"
                  fill="currentColor"
                />
                <span>{headerRating}</span>
                <span>•</span>
                <span className="text-green-600 dark:text-green-400">
                  Online
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigateTo("task", { taskId: chatId })}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="View task details"
          >
            View Task
          </button>
        </div>
      </div>

      {/* Sticky Task Context */}
      <div className="sticky task-context bg-emerald-50 dark:bg-emerald-900 border-b border-emerald-100 dark:border-emerald-800 px-3 py-2 sm:px-4 sm:py-3 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm sm:text-base text-emerald-900 dark:text-emerald-300">
              {task?.title || "Task"}
            </h4>
            {typeof task?.budget !== "undefined" && (
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                Budget: ₹{Number(task?.budget ?? 0).toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <button
            onClick={() => navigateTo("task", { taskId: chatId })}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs sm:text-sm transition-colors"
            aria-label="View task details"
          >
            View Task Details
          </button>
        </div>
      </div>

      {/* Scrollable Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 messages-container">
        <div className="max-w-[90vw] mx-auto space-y-3 sm:space-y-4">
          {messages.map((msg) => {
            const isMine = msg.senderUid === myUid;
            const ts = msg.createdAt?.toDate
              ? msg.createdAt.toDate()
              : msg.createdAt;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-2xl break-words ${
                    isMine
                      ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  }`}
                >
                  <p className="text-xs sm:text-sm">{msg.text}</p>
                  <p
                    className={`text-[10px] sm:text-xs mt-1 ${
                      isMine
                        ? "text-emerald-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {formatTime(ts)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div
        ref={inputWrapperRef}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-3 py-2 sm:px-4 sm:py-3 pb-[env(safe-area-inset-bottom, 0px)] fixed bottom-0 left-0 right-0 z-40"
      >
        <form onSubmit={handleSendMessage} className="max-w-[90vw] mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="p-1 sm:p-2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
              aria-label="Attach file"
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              className="p-1 sm:p-2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 transition-colors"
              aria-label="Attach image"
            >
              <Image size={18} className="sm:w-5 sm:h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={messageInputRef}
                type="text"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 pr-10 sm:pr-12 transition-colors"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setIsTyping(true);
                  clearTimeout(window.__typingTimer);
                  window.__typingTimer = setTimeout(
                    () => setIsTyping(false),
                    800
                  );
                }}
                placeholder="Message..."
                aria-label="Type a message"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className={`absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 p-1 sm:p-2 rounded-full transition-colors ${
                  message.trim()
                    ? "bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500"
                }`}
                aria-label="Send message"
              >
                <Send size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;