"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Send, Heart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "../../../../Loading";

interface NewlyMatchedUser {
  _id: string;
  firstName: string;
  lastName: string;
  annualIncome: string;
  caste: string;
  city: string;
  dateOfBirth: string;
  designation: string;
  gender: string;
  height: string;
  highestEducation: string;
  motherTongue: string;
  profileImage: string;
  religion: string;
  state: string;
}

export default function NewlyMatched({ activeTab }: { activeTab: string }) {
  const [newlyMatched, setNewlyMatched] = useState<NewlyMatchedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // In‑memory UI state – no persistence across refreshes
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());

  const router = useRouter();

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;

  // FETCH NEW USERS
  const fetchNewUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      setIsLoading(true);

      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/profile/newly-user",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);
      
      // Filter out permanently skipped profiles only
      const filteredUsers = (data.users || []).filter(
        (user: NewlyMatchedUser) => !permanentlySkipped.has(user._id)
      );
      
      setNewlyMatched(filteredUsers);
      setCurrentPage(1);
    } catch {
      toast.error("Failed to load newly matched users.");
    } finally {
      setIsLoading(false);
    }
  }, [permanentlySkipped]);

  useEffect(() => {
    if (activeTab !== "New Profile") return;
    fetchNewUsers();
  }, [activeTab, fetchNewUsers]);

  // AGE
  const calculateAge = (dob: string) => {
    if (!dob) return "—";
    const d = new Date(dob);
    return new Date().getFullYear() - d.getFullYear();
  };

  // ACTION: SEND CONNECTION
  const handleSendConnection = async (id: string) => {
    try {
      if (connectedProfiles.has(id)) {
        // Already connected – do nothing
        return;
      }

      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/request/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId: id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send connection");
      }

      // Mark as connected locally for immediate feedback
      setConnectedProfiles(prev => new Set(prev).add(id));
      toast.success("Connection request sent!");

      // Refresh the list to reflect any backend changes
      await fetchNewUsers();
      
    } catch (error: any) {
      if (error.message.includes("already sent")) {
        setConnectedProfiles(prev => new Set(prev).add(id));
        toast.success("Connection request already sent!");
        await fetchNewUsers(); // still refresh
      } else {
        toast.error(error.message || "Failed to send connection");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ACTION: SHORTLIST
  const handleShortlist = async (id: string) => {
    try {
      if (likedProfiles.has(id)) {
        return; // Already liked – do nothing
      }

      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/like/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId: id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to shortlist");
      }

      setLikedProfiles(prev => new Set(prev).add(id));
      toast.success("Profile liked!");

      // Refresh the list to reflect any backend changes
      await fetchNewUsers();
      
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setLikedProfiles(prev => new Set(prev).add(id));
        await fetchNewUsers(); // still refresh
      } else {
        toast.error(error.message || "Failed to shortlist");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ACTION: NOT NOW (SKIP PERMANENTLY) – UPDATED TO /api/like/unlike
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/like/unlike",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId: id }), // ✅ now using receiverId
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to skip profile");
      }

      const result = await response.json();
      if (result.success) {
        setPermanentlySkipped(prev => new Set(prev).add(id));
        toast.success("Profile skipped!");

        // Refresh the list – the skipped profile will be filtered out
        await fetchNewUsers();
      } else {
        throw new Error(result.message || "Skip failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to skip profile");
    }
  };

  // REFRESH BUTTON (optional, kept for manual refresh)
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchNewUsers();
      toast.success("Profiles refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (activeTab !== "New Profile") return null;

  // PAGINATION
  const totalPages = Math.ceil(newlyMatched.length / profilesPerPage);
  const indexLast = currentPage * profilesPerPage;
  const indexFirst = indexLast - profilesPerPage;
  const currentProfiles = newlyMatched.slice(indexFirst, indexLast);

  return (
    <div className="space-y-6 mt-0">
      {/* LOADING */}
      {isLoading ? (
        <Loading message="Loading new profiles..." />
      ) : currentProfiles.length === 0 ? (
        <div className="text-center text-gray-600 py-8">
          <p>No new profiles found.</p>
        </div>
      ) : (
        <>
          {currentProfiles.map((user) => {
            const isLiked = likedProfiles.has(user._id);
            const isConnected = connectedProfiles.has(user._id);
            
            return (
              <div
                key={user._id}
                className="p-6 bg-white rounded-lg border border-[#7D0A0A] shadow-sm
                flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >
                {/* IMAGE */}
                <div className="flex justify-center md:block">
                  <Image
                    src={user.profileImage || "/default-avatar.png"}
                    alt={user.firstName}
                    width={96}
                    height={96}
                    className="w-28 h-28 rounded-full object-cover cursor-pointer"
                    onClick={() => router.push(`/matches/${user._id}`)}
                  />
                </div>

                {/* INFO */}
                <div className="flex-1 text-center md:text-left md:px-6 space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>

                  <p className="text-sm text-gray-500 border-b pb-1">
                    {user._id} | Last seen recently
                  </p>

                  <p className="text-sm text-gray-700">
                    {calculateAge(user.dateOfBirth)} Yrs · {user.height} · {user.caste}
                  </p>

                  <p className="text-sm text-gray-700">
                    {user.designation} · Earns {user.annualIncome}
                  </p>

                  <p className="text-sm text-gray-700">{user.highestEducation}</p>
                  <p className="text-sm text-gray-700">
                    {user.city}, {user.state}
                  </p>
                  <p className="text-sm text-gray-700">{user.motherTongue}</p>
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-3 md:grid-cols-1 gap-4 items-center text-center md:text-left md:border-l md:pl-4">
                  {/* Connect */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Connect</span>
                    <Button
                      disabled={isSendingConnection[user._id] || isConnected}
                      onClick={() => handleSendConnection(user._id)}
                      className={`w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white hover:opacity-90 ${
                        isConnected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSendingConnection[user._id] ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isConnected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Like */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Like</span>
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      disabled={isSendingLike[user._id]}
                      onClick={() => handleShortlist(user._id)}
                      className={`w-10 h-10 rounded-full ${
                        isLiked 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'hover:border-red-300'
                      }`}
                    >
                      {isSendingLike[user._id] ? (
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isLiked ? 'text-white' : 'text-red-600'}`} 
                          fill={isLiked ? "white" : "none"} 
                        />
                      )}
                    </Button>
                  </div>

                  {/* Skip */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Skip</span>
                    <Button
                      variant="outline"
                      onClick={() => handleNotNow(user._id)}
                      className="bg-gray-200 w-10 h-10 rounded-full hover:bg-gray-300"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className={`px-4 py-2 text-white rounded ${
                    currentPage === 1
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#219e25] hover:bg-[#1b7f1e]"
                  }`}
                >
                  Previous
                </button>

                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className={`px-4 py-2 text-white rounded ${
                    currentPage === totalPages
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#219e25] hover:bg-[#1b7f1e]"
                  }`}
                >
                  Next
                </button>
              </div>

              <div className="text-sm text-gray-500">
                Showing {indexFirst + 1}-{Math.min(indexLast, newlyMatched.length)} of{" "}
                {newlyMatched.length} profiles
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}