// components/ChatArea.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import Image from "next/image";
import MessageInput from "./MessageInput";
import { Eye, Download, FileText, MoreVertical, Flag, X } from "lucide-react";
import { Conversation, Message, MessageFile, SocketMessage } from "@/types/chat";

const API_BASE_URL = "https://merimonial-backend.onrender.com";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface ChatAreaProps {
  conversation: Conversation;
  currentUser: User | null;
  socket: Socket;
  onOpenSidebar: () => void;
  onMessageSent: (conversationId: string, text: string) => void;
  messages: Message[];
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
}

function mapSocketToMessage(
  msg: SocketMessage,
  currentUser: User,
  conversation: Conversation
): Message {
  return {
    id: msg._id || msg.tempId || `msg-${msg.senderId}-${msg.receiverId}-${Date.now()}`,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    text: msg.messageText,
    timestamp: msg.createdAt || new Date().toISOString(),
    sender: msg.senderId === currentUser._id ? "me" : "other",
    avatar:
      msg.senderId === currentUser._id
        ? currentUser.profileImage || "/my-avatar.png"
        : conversation.avatar,
    files: msg.files,
    replyTo: msg.replyTo
      ? mapSocketToMessage(msg.replyTo, currentUser, conversation)
      : undefined,
  };
}

export default function ChatArea({
  conversation,
  currentUser,
  socket,
  onOpenSidebar,
  onMessageSent,
  messages,
  setMessages,
}: ChatAreaProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState({ iBlocked: false, blockedMe: false });
  const [conversationOnline, setConversationOnline] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Report Modal States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 100;
  };

  const handleScroll = () => setShouldAutoScroll(isAtBottom());

  // Socket listeners
  useEffect(() => {
    if (!socket || !currentUser || !conversation) return;

    const handleSentMessage = (msg: SocketMessage) => {
      if (msg.receiverId !== conversation.id) return;

      setMessages((prev: Message[]) => {
        if (msg.tempId) {
          const tempIndex = prev.findIndex((m) => m.id === msg.tempId);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = mapSocketToMessage(msg, currentUser, conversation);
            return updated;
          }
        }

        const existingIndex = prev.findIndex((m) => m.id === msg._id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = mapSocketToMessage(msg, currentUser, conversation);
          return updated;
        }

        const lastMsg = prev[prev.length - 1];
        const timeDiff = lastMsg
          ? new Date(msg.createdAt || msg.timestamp).getTime() - new Date(lastMsg.timestamp).getTime()
          : Infinity;

        if (
          lastMsg &&
          lastMsg.senderId === msg.senderId &&
          lastMsg.text === msg.messageText &&
          Math.abs(timeDiff) < 0.00001
        ) {
          const updated = [...prev];
          updated[prev.length - 1] = mapSocketToMessage(msg, currentUser, conversation);
          return updated;
        }

        return [...prev, mapSocketToMessage(msg, currentUser, conversation)];
      });
    };

    const handleIncomingMessage = (msg: SocketMessage) => {
      if (msg.senderId === currentUser._id) return;

      const isRelevant = msg.senderId === conversation.id && msg.receiverId === currentUser._id;
      if (!isRelevant) return;

      setMessages((prev: Message[]) => {
        if (prev.some((m) => m.id === msg._id)) return prev;
        return [...prev, mapSocketToMessage(msg, currentUser, conversation)];
      });

      setShouldAutoScroll(true);
    };

    const handleUserBlocked = (data: any) => {
      if (data.blockedBy === conversation.id) {
        setBlockStatus((prev) => ({ ...prev, blockedMe: true }));
        alert("This user has blocked you.");
      }
    };

    const handleUserUnblocked = (data: any) => {
      if (data.unblockedBy === conversation.id) {
        setBlockStatus((prev) => ({ ...prev, blockedMe: false }));
        alert("You are unblocked by this user.");
      }
    };

    const handleUserOnline = (userId: string) => {
      if (userId === conversation.id) setConversationOnline(true);
    };
    const handleUserOffline = (userId: string) => {
      if (userId === conversation.id) setConversationOnline(false);
    };

    socket.on("msg-sent", handleSentMessage);
    socket.on("msg-receive", handleIncomingMessage);
    socket.on("user-blocked", handleUserBlocked);
    socket.on("user-unblocked", handleUserUnblocked);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);

    return () => {
      socket.off("msg-sent", handleSentMessage);
      socket.off("msg-receive", handleIncomingMessage);
      socket.off("user-blocked", handleUserBlocked);
      socket.off("user-unblocked", handleUserUnblocked);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
    };
  }, [socket, currentUser, conversation, setMessages]);

  // Click outside to close message actions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".message-bubble")) {
        setActiveMessageId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (shouldAutoScroll) scrollToBottom();
  }, [messages, shouldAutoScroll]);

  // Reset scroll when conversation changes
  useEffect(() => {
    if (conversation) {
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom("instant"), 100);
    }
  }, [conversation.id]);

  // Fetch messages
  useEffect(() => {
    if (!currentUser || !conversation) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${API_BASE_URL}/api/message?currentUserId=${conversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch messages");

        const data = await res.json();
        const loadedMessages: Message[] = data.data.map((msg: SocketMessage) =>
          mapSocketToMessage(msg, currentUser, conversation)
        );

        setMessages(loadedMessages);
        setIsLoading(false);
        setShouldAutoScroll(true);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [conversation.id, currentUser, setMessages]);

  // Fetch block status
  useEffect(() => {
    if (!conversation) return;
    const fetchBlockStatus = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${API_BASE_URL}/api/message/isBlocked/${conversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setBlockStatus({ iBlocked: data.data.iBlocked, blockedMe: data.data.blockedMe });
        }
      } catch (err) {
        console.error("Failed to fetch block status:", err);
      }
    };
    fetchBlockStatus();
  }, [conversation]);

  // Fetch online status
  useEffect(() => {
    const fetchOnlineStatus = async () => {
      if (!conversation.id) return;
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${API_BASE_URL}/api/message/online`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const onlineUsers: string[] = data.data || [];
        setConversationOnline(onlineUsers.includes(conversation.id));
      } catch (err) {
        console.error("Failed to fetch online status:", err);
        setConversationOnline(false);
      }
    };
    fetchOnlineStatus();
  }, [conversation.id]);

  const onSendMessage = async (text: string, files?: File[]) => {
    if (!currentUser || !conversation.id) return;
    if (!text.trim() && (!files || files.length === 0)) return;

    const token = localStorage.getItem("authToken");
    const tempId = "temp-" + Date.now();

    const localFiles = files?.length
      ? files.map((file) => ({
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileType: file.type,
          fileSize: file.size,
        }))
      : [];

    setMessages((prev: Message[]) => [
      ...prev,
      {
        id: tempId,
        senderId: currentUser._id,
        receiverId: conversation.id,
        text,
        timestamp: new Date().toISOString(),
        sender: "me",
        avatar: currentUser.profileImage,
        files: localFiles,
      },
    ]);

    scrollToBottom();

    try {
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append("receiverId", conversation.id);
        if (replyingMessage?.id) formData.append("replyToId", replyingMessage.id);
        files.forEach((file) => formData.append("file", file));

        socket.emit("send-msg", {
          tempId,
          from: currentUser._id,
          to: conversation.id,
          messageText: text,
          replyToId: replyingMessage?.id || null,
        });

        const res = await fetch(`${API_BASE_URL}/api/message/send-file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          setMessages((prev: Message[]) =>
            prev.map((m) =>
              m.id === tempId ? mapSocketToMessage(data.data, currentUser, conversation) : m
            )
          );
        }
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: conversation.id,
          messageText: text,
          replyToId: replyingMessage?.id || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev: Message[]) =>
          prev.map((m) =>
            m.id === tempId ? mapSocketToMessage(data.data, currentUser, conversation) : m
          )
        );
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setReplyingMessage(null);
    }
  };

  const handleBlockUser = async () => {
    if (!conversation.id) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/message/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otherUserId: conversation.id }),
      });
      if (!res.ok) throw new Error("Failed to block user");
      setBlockStatus({ ...blockStatus, iBlocked: true });
      alert("User blocked");
      setHeaderMenuOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUnblockUser = async () => {
    if (!conversation.id) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/message/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otherUserId: conversation.id }),
      });
      if (!res.ok) throw new Error("Failed to unblock user");
      setBlockStatus({ ...blockStatus, iBlocked: false });
      alert("User unblocked");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteAllChat = async () => {
    if (!conversation.id) return;
    if (!confirm("Delete all chat messages?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/message/delete/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otherUserId: conversation.id }),
      });
      if (!res.ok) throw new Error("Failed to delete all messages");

      setMessages([]);
      alert("All messages deleted successfully");
      setHeaderMenuOpen(false);

      socket.emit("delete-chat", { from: currentUser?._id, to: conversation.id });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (msgId.startsWith("temp-"))
      return setMessages((prev: Message[]) => prev.filter((m) => m.id !== msgId));

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/message/delete/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageId: msgId }),
      });
      if (!res.ok) throw new Error("Failed to delete message");
      setMessages((prev: Message[]) => prev.filter((m) => m.id !== msgId));
      setActiveMessageId(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleReply = (msg: Message) => {
    setReplyingMessage(msg);
    setActiveMessageId(null);
  };

  const handleSubmitReport = async () => {
    if (!reportTitle.trim() || !reportDescription.trim()) {
      alert("Please fill all required fields");
      return;
    }

    setIsSubmittingReport(true);
    setReportSuccess(false);

    try {
      const token = localStorage.getItem("authToken");
      const reporterId = currentUser?._id;
      const reportedUserId = conversation.id;

      if (!reporterId) {
        alert("Please login to submit report");
        return;
      }

      const formData = new FormData();
      formData.append("reporter", reporterId);
      formData.append("reportedUser", reportedUserId);
      formData.append("title", reportTitle);
      formData.append("description", reportDescription);
      reportImages.forEach((img) => formData.append("image", img));

      const res = await fetch(`${API_BASE_URL}/api/report/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setIsReportOpen(false);
          setReportTitle("");
          setReportDescription("");
          setReportImages([]);
          setReportSuccess(false);
        }, 2000);
      } else {
        alert(data.message || "Failed to submit report");
      }
    } catch (err) {
      console.error("Report submission error:", err);
      alert("An error occurred while submitting the report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isImage = (fileType: string) => fileType.startsWith("image/");

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    /*
     * ✅ FIX: h-dvh (dynamic viewport height) handles mobile browsers correctly.
     * On mobile, 100vh includes the browser chrome (address bar), so content
     * gets hidden underneath it. dvh = actual visible height. flex-col ensures
     * header stays top, input stays bottom, messages scroll in between.
     */
    <div className="flex flex-col h-dvh md:h-full overflow-hidden relative">

      {/* ── HEADER ── */}
      {/*
       * ✅ FIX: Removed max-md:fixed — fixed positioning on mobile was the
       * main scroll killer. The header was overlapping the messages container
       * because fixed elements are taken out of normal flow.
       * Now it just sits at the top of the flex column naturally.
       */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex items-center justify-between relative z-10 flex-shrink-0">
        <button onClick={onOpenSidebar} className="md:hidden mr-2">☰</button>

        <div className="flex items-center space-x-3 flex-1">
          <div className="relative">
            {conversation.avatar ? (
              <Image
                src={conversation.avatar}
                alt={conversation.name}
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center text-lg font-semibold">
                {conversation.name?.charAt(0).toUpperCase()}
              </div>
            )}
            {conversationOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{conversation.name}</h2>
            <p className={`text-xs sm:text-sm ${conversationOnline ? "text-green-600" : "text-gray-500"}`}>
              {conversationOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setHeaderMenuOpen((prev) => !prev)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <MoreVertical size={20} />
          </button>

          {headerMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-xl rounded-xl border z-50 overflow-hidden">
              <button
                onClick={() => { setIsReportOpen(true); setHeaderMenuOpen(false); }}
                className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
              >
                <Flag size={16} className="mr-2" />
                Report User
              </button>

              {!blockStatus.iBlocked ? (
                <button
                  onClick={handleBlockUser}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Block User
                </button>
              ) : (
                <button
                  onClick={handleUnblockUser}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-yellow-700"
                >
                  Unblock
                </button>
              )}

              <button
                onClick={handleDeleteAllChat}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-500"
              >
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MESSAGES AREA ── */}
      {/*
       * ✅ FIX: flex-1 + overflow-y-auto = this div takes all remaining space
       * between header and input, and scrolls independently.
       * min-h-0 is critical — without it, flex children don't shrink below
       * their content size, so overflow-y-auto has no effect on mobile.
       */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-4 bg-gray-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No messages yet. Say hi! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"} message-bubble`}
                onClick={() => setActiveMessageId(msg.id === activeMessageId ? null : msg.id)}
              >
                {/* Left avatar for other user */}
                {!isMe && (
                  <img
                    src={msg.avatar || "/default-avatar.png"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mr-2 self-end"
                    alt="avatar"
                  />
                )}

                <div
                  className={`
                    relative p-3 rounded-2xl break-words
                    max-w-[80%] sm:max-w-xs lg:max-w-md
                    ${isMe
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-white shadow-sm border rounded-bl-sm"
                    }
                    ${replyingMessage?.id === msg.id ? "ring-2 ring-indigo-400" : ""}
                  `}
                >
                  {/* Reply preview */}
                  {msg.replyTo && (
                    <div className="bg-indigo-100 text-indigo-800 p-2 rounded mb-2 border-l-4 border-indigo-500 text-xs font-medium truncate max-w-[200px]">
                      {msg.replyTo.text || "File/Media"}
                    </div>
                  )}

                  {/* Text */}
                  {msg.text && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-1">{msg.text}</p>
                  )}

                  {/* Files */}
                  {msg.files && msg.files.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.files.map((file, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                          {isImage(file.fileType) ? (
                            <div className="relative">
                              <img
                                src={file.fileUrl}
                                alt={file.fileName}
                                className="w-full object-cover max-h-48 sm:max-h-64 rounded-lg cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); window.open(file.fileUrl, "_blank"); }}
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(file.fileUrl, "_blank"); }}
                                  className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(file.fileUrl, file.fileName); }}
                                  className="p-1 bg-black/50 text-white rounded hover:bg-black/70"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-3 p-2 ${isMe ? "bg-indigo-600" : "bg-gray-50"}`}>
                              <FileText size={20} className={isMe ? "text-white" : "text-gray-600"} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                <p className={`text-xs ${isMe ? "text-white/70" : "text-gray-500"}`}>
                                  {(file.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(file.fileUrl, "_blank"); }}
                                  className={`p-1 rounded ${isMe ? "hover:bg-white/20" : "hover:bg-gray-200"}`}
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(file.fileUrl, file.fileName); }}
                                  className={`p-1 rounded ${isMe ? "hover:bg-white/20" : "hover:bg-gray-200"}`}
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className={`text-[10px] sm:text-xs mt-1 ${isMe ? "text-white/70" : "text-gray-400"}`}>
                    {formatTime(msg.timestamp)}
                  </p>

                  {/* Action popup (reply / delete) */}
                  {activeMessageId === msg.id && (
                    <div className={`
                      absolute top-0 z-50 bg-white border shadow-lg rounded-md text-sm flex flex-col overflow-hidden
                      ${isMe ? "right-full mr-2" : "left-full ml-2"}
                    `}>
                      <button
                        className="px-3 py-2 hover:bg-gray-100 text-black text-left"
                        onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                      >
                        Reply
                      </button>
                      {isMe && (
                        <button
                          className="px-3 py-2 hover:bg-gray-100 text-red-500 text-left"
                          onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right avatar for me */}
                {isMe && (
                  <img
                    src={msg.avatar || "/default-avatar.png"}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ml-2 self-end"
                    alt="avatar"
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── BLOCK / UNBLOCK NOTICES ── */}
      {blockStatus.blockedMe && (
        <div className="flex-shrink-0 bg-red-100 border-t border-red-300 text-red-700 px-4 py-2 text-center text-sm">
          You are blocked by this user
        </div>
      )}
      {blockStatus.iBlocked && !blockStatus.blockedMe && (
        <div className="flex-shrink-0 bg-yellow-100 border-t border-yellow-300 text-yellow-700 px-4 py-2 text-center text-sm flex justify-center items-center gap-2">
          <span>You have blocked this user.</span>
          <button onClick={handleUnblockUser} className="underline font-semibold">Unblock</button>
        </div>
      )}

      {/* ── REPLY PREVIEW ── */}
      {replyingMessage && (
        <div className="flex-shrink-0 px-4 py-2 bg-indigo-50 border-t border-indigo-200 flex items-center justify-between">
          <div className="flex flex-col max-w-[85%]">
            <span className="text-[11px] text-indigo-600 font-medium">Replying to</span>
            <span className="text-sm text-indigo-900 truncate">
              {replyingMessage.text || "File / Media"}
            </span>
          </div>
          <button
            onClick={() => setReplyingMessage(null)}
            className="text-indigo-400 hover:text-red-500 ml-2"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── MESSAGE INPUT ── */}
      {/* flex-shrink-0 ensures input is never pushed off screen */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={onSendMessage}
          replyingMessage={
            replyingMessage
              ? { text: replyingMessage.text || "", id: replyingMessage.id }
              : undefined
          }
          onCancelReply={() => setReplyingMessage(null)}
          disabled={blockStatus.blockedMe || blockStatus.iBlocked}
          socket={socket}
          currentUser={currentUser}
          to={conversation.id}
        />
      </div>

      {/* ── REPORT MODAL ── */}
      {isReportOpen && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Report User</h3>
              <button
                onClick={() => setIsReportOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={isSubmittingReport}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {reportSuccess ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
                  <div className="text-lg font-semibold mb-1">✓ Report Submitted!</div>
                  <p className="text-sm">Your report will be reviewed by our team.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <select
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={isSubmittingReport}
                    >
                      <option value="">Select a reason</option>
                      <option value="spam">Spam</option>
                      <option value="inappropriate">Inappropriate Content</option>
                      <option value="harassment">Harassment</option>
                      <option value="fake">Fake Profile</option>
                      <option value="scam">Scam/Fraud</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      disabled={isSubmittingReport}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proof Images (Optional)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setReportImages(Array.from(e.target.files || []))}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={isSubmittingReport}
                    />
                    {reportImages.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {reportImages.map((img, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                            <img
                              src={URL.createObjectURL(img)}
                              className="w-full h-full object-cover"
                              alt={`proof-${i}`}
                            />
                            <button
                              onClick={() => setReportImages(reportImages.filter((_, idx) => idx !== i))}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                              disabled={isSubmittingReport}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {!reportSuccess && (
              <div className="flex justify-end gap-3 p-5 border-t">
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  disabled={isSubmittingReport}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmittingReport || !reportTitle.trim() || !reportDescription.trim()}
                  className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}