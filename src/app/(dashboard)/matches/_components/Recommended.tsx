"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Send, Heart, X, Check } from "lucide-react";
import Loading from "../../../../Loading";
import { useRouter } from "next/navigation";

interface RecommendationProps {
  activeTab: string;
}

interface RecommendedProfile {
  _id: string;
  name: string;
  age: number | string;
  location: string;
  profileImage: string;
  lastSeen: string;
  height?: string;
  religion?: string;
  profession?: string;
  salary?: string;
  education?: string;
  languages?: string[];
  gender?: string;
  id?: string;
  matchPercentage?: number;
}

export default function Recommendation({ activeTab }: RecommendationProps) {
  const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // In‑memory UI state
  const [isSendingConnection, setIsSendingConnection] = useState<{ [key: string]: boolean }>({});
  const [isSendingLike, setIsSendingLike] = useState<{ [key: string]: boolean }>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  const router = useRouter();

  const fetchProfiles = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");

      setLoading(true);

      const res = await fetch("https://merimonial-backend.onrender.com/api/match/preferences-profiles", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch recommendations");

      const responseData = await res.json();

      if (!responseData.success || !responseData.data) throw new Error("Invalid response format");

      // Filter out permanently skipped profiles
      const filteredProfiles = responseData.data.filter(
        (item: any) => !permanentlySkipped.has(item._id)
      );

      // Map API items to our component's expected structure
      const cleaned = filteredProfiles.map((item: any) => {
        const locationPref = item.preferences?.location || {};
        const location = [locationPref.city, locationPref.state, locationPref.country]
          .filter(Boolean)
          .join(", ") || "—";

        const heightPref = item.preferences?.height;
        const height = heightPref
          ? `${heightPref.min} - ${heightPref.max}`
          : "—";

        return {
          _id: item._id,
          id: item.userId || item._id,
          name: item.name || "—",
          age: "—",
          location,
          profileImage: item.image || "/default-avatar.png",
          height,
          religion: item.preferences?.religion || "—",
          profession: item.preferences?.profession || "—",
          salary: "—",
          education: item.preferences?.education || "—",
          languages: ["—"],
          lastSeen: "Recently",
          gender: item.gender || "—",
          matchPercentage: item.matchPercentage,
        };
      });

      setProfiles(cleaned);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [permanentlySkipped]);

  useEffect(() => {
    if (activeTab === "Preference") {
      fetchProfiles();
    }
  }, [activeTab, fetchProfiles]);

  // PAGINATION
  const totalPages = Math.ceil(profiles.length / limit);
  const currentData = profiles.slice((currentPage - 1) * limit, currentPage * limit);

  const removeProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p._id !== id));
  };

  // ✅ CORRECTED: send connection request with receiverId
  const handleSendConnection = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      
      if (connectedProfiles.has(id)) {
        return;
      }

      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://merimonial-backend.onrender.com/api/request/send", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ receiverId: id }), // ✅ now sends receiverId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send connection");
      }

      const data = await response.json();
      if (data.success) {
        setConnectedProfiles(prev => new Set(prev).add(id));
        toast.success("Connection request sent!");
      } else {
        throw new Error(data.message || "Failed to send connection");
      }
      
    } catch (error: any) {
      if (error.message.includes("already sent")) {
        setConnectedProfiles(prev => new Set(prev).add(id));
        toast.success("Connection request already sent!");
      } else {
        toast.error(error.message || "Failed to send connection");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // SHORTLIST (unchanged – uses receiverId)
  const handleShortlist = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      if (likedProfiles.has(id)) {
        toast.success("Profile liked!");
        return;
      }

      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://merimonial-backend.onrender.com/api/like/send", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ receiverId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to shortlist");
      }

      const data = await response.json();
      if (data.success) {
        setLikedProfiles(prev => new Set(prev).add(id));
        toast.success("Profile liked!");
      } else {
        throw new Error(data.message || "Failed to shortlist");
      }
      
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setLikedProfiles(prev => new Set(prev).add(id));
        toast.success("Profile liked!");
      } else {
        toast.error(error.message || "Failed to shortlist");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // NOT NOW – UPDATED to /api/like/unlike with receiverId
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://merimonial-backend.onrender.com/api/like/unlike", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ receiverId: id }), // ✅ now using receiverId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to skip profile");
      }

      const data = await response.json();
      if (data.success) {
        setPermanentlySkipped(prev => new Set(prev).add(id));
        toast.success("Profile skipped!");
        removeProfile(id);
      } else {
        throw new Error(data.message || "Failed to skip profile");
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to skip profile");
    }
  };

  if (activeTab !== "Preference") return null;

  return (
    <div className="space-y-14 mt-0">
      {loading ? (
        <Loading message="Loading recommended profiles..." />
      ) : currentData.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          <p className="text-lg mb-2">No recommendations found.</p>
        </div>
      ) : (
        <>
          {currentData.map((p) => {
            const isLiked = likedProfiles.has(p._id);
            const isConnected = connectedProfiles.has(p._id);
            
            return (
              <div
                key={p._id}
                className="p-6 bg-white rounded-lg border border-[#7D0A0A] shadow-sm
                flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >
                {/* IMAGE */}
                <div className="flex justify-center md:block">
                  <Image
                    src={p.profileImage}
                    alt={p.name}
                    width={96}
                    height={96}
                    className="w-28 h-28 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => router.push(`/matches/${p._id}`)}
                  />
                </div>

                {/* INFO */}
                <div className="flex-1 text-center md:text-left md:px-6 space-y-1">
                  <h3 className="text-lg font-semibold">{p.name}</h3>

                  <p className="text-sm text-gray-500 border-b pb-1">
                    {p.id || p._id} | Last seen {p.lastSeen}
                    {p.matchPercentage && ` | Match ${p.matchPercentage}%`}
                  </p>

                  <p className="text-sm text-gray-700">
                    {p.age} Yrs · {p.height} · {p.religion}
                  </p>

                  <p className="text-sm text-gray-700">
                    {p.profession} · Earns {p.salary}
                  </p>

                  <p className="text-sm text-gray-700">{p.education}</p>
                  <p className="text-sm text-gray-700">{p.location}</p>

                  <p className="text-sm text-gray-700">
                    {p.languages?.join(", ")}
                  </p>
                </div>

                {/* ACTION BUTTONS */}
                <div
                  className="
                    grid grid-cols-3 md:grid-cols-1 gap-4 
                    items-center text-center md:text-left md:border-l md:pl-4
                  "
                >
                  {/* CONNECT */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Connect</span>
                    <Button
                      disabled={isSendingConnection[p._id] || isConnected}
                      onClick={() => handleSendConnection(p._id)}
                      className={`w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white hover:opacity-90 ${
                        isConnected ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSendingConnection[p._id] ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isConnected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* SHORTLIST */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Like</span>
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      disabled={isSendingLike[p._id]}
                      onClick={() => handleShortlist(p._id)}
                      className={`w-10 h-10 rounded-full ${
                        isLiked 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'hover:border-red-300'
                      }`}
                    >
                      {isSendingLike[p._id] ? (
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isLiked ? 'text-white' : 'text-red-600'}`} 
                          fill={isLiked ? "white" : "none"} 
                        />
                      )}
                    </Button>
                  </div>

                  {/* SKIP */}
                  <div className="flex flex-col items-center md:flex-row gap-2">
                    <span className="text-sm">Skip</span>
                    <Button
                      variant="outline"
                      onClick={() => handleNotNow(p._id)}
                      className="bg-gray-100 hover:bg-gray-200 border-gray-300 w-10 h-10 rounded-full"
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
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={`px-5 py-2 text-white rounded transition
                  ${currentPage === 1 
                    ? "bg-gray-300 cursor-not-allowed" 
                    : "bg-[#219e25] hover:bg-[#1b7f1e]"}`}
              >
                Previous
              </button>

              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={`px-5 py-2 text-white rounded transition
                  ${currentPage === totalPages 
                    ? "bg-gray-300 cursor-not-allowed" 
                    : "bg-[#219e25] hover:bg-[#1b7f1e]"}`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}