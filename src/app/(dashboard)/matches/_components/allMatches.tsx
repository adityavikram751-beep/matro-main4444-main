"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Send, Heart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "../../../../Loading";

interface AllMatchesProps {
  activeTab: string;
}

interface MatchProfile {
  id: string;           // user ID (_id from API)
  name: string;
  image: string;
  quote?: string;
  partnerName?: string;
  age: string | number;
  height: string;
  caste: string;
  profession: string;
  salary: string;        // maps to income
  education: string;
  location: string;
  languages: string[];
  lastSeen: string;
}

export default function AllMatches({ activeTab }: AllMatchesProps) {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // UI state
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  const fetchAllMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      setIsLoadingMatches(true);

      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/match/all",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error("Invalid response");
      }

      // Filter out permanently skipped profiles (by user ID)
      const filteredUsers = result.data.filter(
        (item: any) => !permanentlySkipped.has(item._id)
      );

      const cleaned: MatchProfile[] = filteredUsers.map((item: any) => ({
        id: item._id,
        name: item.name || "Unknown",
        image: item.profileImage || "/no-img.png",
        quote: item.quote,
        partnerName: item.partnerName,
        age: item.age ?? "—",
        height: item.height || "—",
        caste: item.caste || "—",
        profession: item.profession || "—",
        salary: item.income || "—",
        education: item.education || "—",
        location: item.location || "—",
        languages: ["—"],
        lastSeen: "Recently",
      }));

      setMatches(cleaned);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast.error("Failed to load matches");
    } finally {
      setIsLoadingMatches(false);
    }
  }, [permanentlySkipped]);

  useEffect(() => {
    if (activeTab === "Profile Match") {
      fetchAllMatches();
      setCurrentPage(1);
    }
  }, [activeTab, fetchAllMatches]);

  const removeProfile = (userId: string) => {
    setMatches((prev) => prev.filter((p) => p.id !== userId));
  };

  // Send connection request – expects receiverId = userId
  const handleSendConnection = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");

      if (connectedProfiles.has(userId)) {
        return; // already connected
      }

      setIsSendingConnection((prev) => ({ ...prev, [userId]: true }));

      const response = await fetch("https://merimonial-backend.onrender.com/api/request/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      const result = await response.json();
      if (result.success) {
        setConnectedProfiles((prev) => new Set(prev).add(userId));
        toast.success("Connection request sent!");
        fetchAllMatches();
      } else {
        throw new Error(result.message || "Request failed");
      }
    } catch (error: any) {
      if (error.message?.includes("already sent")) {
        setConnectedProfiles((prev) => new Set(prev).add(userId));
      } else {
        toast.error("Failed to send connection request");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Send like – expects receiverId (userId)
  const handleShortlist = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");

      if (likedProfiles.has(userId)) {
        return;
      }

      setIsSendingLike((prev) => ({ ...prev, [userId]: true }));

      const response = await fetch("https://merimonial-backend.onrender.com/api/like/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      const result = await response.json();
      if (result.success) {
        setLikedProfiles((prev) => new Set(prev).add(userId));
        toast.success("Profile liked!");
      } else {
        throw new Error(result.message || "Like failed");
      }
    } catch (error: any) {
      if (error.message?.includes("already liked")) {
        setLikedProfiles((prev) => new Set(prev).add(userId));
      } else {
        toast.error("Failed to like profile");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Skip profile – now uses /api/like/unlike with receiverId
  const handleNotNow = async (userId: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://merimonial-backend.onrender.com/api/like/unlike", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result.success) {
        setPermanentlySkipped((prev) => new Set(prev).add(userId));
        toast.success("Profile skipped!");
        removeProfile(userId);
      }
    } catch (error) {
      toast.error("Failed to skip profile");
    }
  };

  const totalPages = Math.ceil(matches.length / profilesPerPage);
  const indexOfLast = currentPage * profilesPerPage;
  const indexOfFirst = indexOfLast - profilesPerPage;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);

  return (
    <>
      {activeTab !== "Profile Match" ? null : (
        <div className="space-y-6 mt-0">
          {isLoadingMatches ? (
            <Loading message="Loading matches..." />
          ) : currentMatches.length > 0 ? (
            currentMatches.map((profile) => {
              const isLiked = likedProfiles.has(profile.id);
              const isConnected = connectedProfiles.has(profile.id);

              return (
                <div
                  key={profile.id}
                  className="p-6 bg-white rounded-lg border border-[#7D0A0A] shadow-sm 
                  flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                >
                  {/* Image */}
                  <div className="flex justify-center md:block">
                    <Image
                      src={profile.image}
                      alt={profile.name}
                      width={96}
                      height={96}
                      className="w-28 h-28 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => router.push(`/matches/${profile.id}`)}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left md:px-6 space-y-1">
                    <h3 className="text-lg font-semibold">{profile.name}</h3>
                    {profile.quote && (
                      <p className="text-sm text-gray-500 italic">"{profile.quote}"</p>
                    )}
                    {profile.partnerName && (
                      <p className="text-sm text-gray-500">Partner: {profile.partnerName}</p>
                    )}

                    <p className="text-sm text-gray-500 border-b pb-1">
                      ID: {profile.id.slice(-6)} | Last seen {profile.lastSeen}
                    </p>

                    {/* Real data from API */}
                    <p className="text-sm text-gray-700">
                      {profile.age} Yrs · {profile.height} · {profile.caste}
                    </p>
                    <p className="text-sm text-gray-700">
                      {profile.profession} · Earns {profile.salary}
                    </p>
                    <p className="text-sm text-gray-700">{profile.education}</p>
                    <p className="text-sm text-gray-700">{profile.location}</p>
                    <p className="text-sm text-gray-700">{profile.languages.join(", ")}</p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 md:grid-cols-1 gap-4 items-center text-center md:text-left 
                  md:border-l md:pl-4">
                    {/* Connect */}
                    <div className="flex flex-col items-center md:flex-row gap-2">
                      <span className="text-sm">Connect</span>
                      <Button
                        disabled={isSendingConnection[profile.id] || isConnected}
                        onClick={() => handleSendConnection(profile.id)}
                        className={`w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white hover:opacity-90 ${
                          isConnected ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isSendingConnection[profile.id] ? (
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
                        disabled={isSendingLike[profile.id]}
                        onClick={() => handleShortlist(profile.id)}
                        className={`w-10 h-10 rounded-full ${
                          isLiked
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "hover:border-red-300"
                        }`}
                      >
                        {isSendingLike[profile.id] ? (
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Heart
                            className={`w-4 h-4 ${isLiked ? "text-white" : "text-red-600"}`}
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
                        onClick={() => handleNotNow(profile.id)}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 border-gray-300"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-10">
              <p className="text-lg mb-2">No matches found.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
              <div className="flex items-center gap-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className={`px-5 py-2 text-white rounded transition ${
                    currentPage === 1
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#219e25] hover:bg-[#1b7f1e]"
                  }`}
                >
                  Previous
                </button>

                <span className="text-gray-700 font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className={`px-5 py-2 text-white rounded transition ${
                    currentPage === totalPages
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-[#219e25] hover:bg-[#1b7f1e]"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}