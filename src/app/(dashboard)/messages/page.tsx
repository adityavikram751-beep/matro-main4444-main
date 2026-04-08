"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import MessageSidebar from "@/app/(dashboard)/messages/_components/MessageSidebar";
import ChatArea from "@/app/(dashboard)/messages/_components/ChatArea";
import { Conversation, Message } from "@/types/chat";
import { MessageCircle, Menu } from "lucide-react";

const API_BASE_URL = "https://merimonial-backend.onrender.com"; 

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

let socket: Socket;

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // messages for selected conversation

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 1. Get token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
      decodeUserAndInitSocket(storedToken);
    } else {
      setError("No authentication token found. Please login first.");
      setIsLoading(false);
    }
  }, []);

  // 2. Decode token, set currentUser, connect socket, fetch users
  const decodeUserAndInitSocket = async (authToken: string) => {
    try {
      // Decode JWT to get userId
      const tokenData = JSON.parse(atob(authToken.split(".")[1]));
      if (!tokenData.userId) throw new Error("Invalid token format");

      const user: User = {
        _id: tokenData.userId,
        firstName: "Current",
        lastName: "User",
      };
      setCurrentUser(user);

      // Connect socket
      socket = io(API_BASE_URL, {
        transports: ["websocket"],
      });
      socket.emit("add-user", user._id);

      // Fetch all users (contacts)
      await fetchAllUsers(authToken, user);
    } catch (err) {
      console.error(err);
      setError("Failed to initialize application.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fetch users from API (use correct endpoint)
  const fetchAllUsers = async (authToken: string, user: User) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/message/allUser`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json();
      console.log("All users response:", data);

      if (data.success && Array.isArray(data.data)) {
        // Find full current user info (with profileImage)
        const fullCurrent = data.data.find((u: User) => u._id === user._id);
        if (fullCurrent) setCurrentUser(fullCurrent);

        // Map other users to Conversation objects
        const mapped: Conversation[] = data.data
          .filter((u: User) => u._id !== user._id)
          .map((u: User) => ({
            id: u._id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            avatar: u.profileImage || "/default-avatar.png",
            lastMessage: "",
            isOnline: false, // will be updated by socket events
            unreadCount: 0,
          }));

        setConversations(mapped);
      } else {
        console.error("Unexpected API response:", data);
        setError("Failed to load users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Network error while fetching users");
    }
  };

  // 4. Handle message sent – update conversations list and messages
  const handleMessageSent = (conversationId: string, text: string) => {
    // Update lastMessage in conversations list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: text, unreadCount: 0 }
          : c
      )
    );
    // Optionally, you could also add the message to messages state here,
    // but ChatArea already does that via optimistic update.
  };

  // 5. Listen for online/offline events to update isOnline in conversations
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (userId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, isOnline: true } : c))
      );
    };
    const handleUserOffline = (userId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, isOnline: false } : c))
      );
    };

    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);

    return () => {
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
    };
  }, [socket]);

  // Loading and error states
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static top-0 left-0 h-full z-40
          w-[280px] md:w-[320px]
          bg-white border-r shadow-lg
          transform transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <MessageSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          currentUser={currentUser}
          socket={socket}
          onSelectConversation={(conv) => {
            setSelectedConversation(conv);
            setIsSidebarOpen(false); // close sidebar on mobile
            // Clear messages when switching conversation
            setMessages([]);
          }}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          onRetry={() => window.location.reload()}
          onLogout={() => {
            if (socket) socket.disconnect();
            localStorage.removeItem("authToken");
            window.location.href = "/login"; // adjust your login route
          }}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-3 border-b bg-white">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-semibold">Messages</h2>
        </div>

        {selectedConversation ? (
          <ChatArea
            conversation={selectedConversation}
            currentUser={currentUser}
            socket={socket}
            messages={messages}
            setMessages={setMessages}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600">
                Select a chat to start
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}