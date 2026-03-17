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
  id: string;
  profileId: string;
  name: string;
  image: string;
  age: string | number;
  height: string;
  caste: string;
  profession: string;
  salary: string;
  education: string;
  location: string;
  languages: string[];
  lastSeen: string;
  _id?: string;
}

export default function AllMatches({ activeTab }: AllMatchesProps) {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // In‑memory UI state – no persistence across refreshes
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  const calculateAge = (dob: string) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "—";
    return new Date().getFullYear() - birthDate.getFullYear();
  };

  const fetchAllMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      setIsLoadingMatches(true);

      const response = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/like/profileMatch",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success || !data.users) return;

      // Filter out only permanently skipped profiles – connected/liked profiles remain visible
      const filteredUsers = data.users.filter((user: any) => 
        !permanentlySkipped.has(user._id)
      );

      const cleaned = filteredUsers.map((user: any) => ({
        id: user._id,
        profileId: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        image: user.profileImage || "/no-img.png",
        age: calculateAge(user.dateOfBirth),
        height: user.height || "—",
        caste: user.caste || "—",
        profession: user.designation || "—",
        salary: user.annualIncome || "—",
        education: user.highestEducation || "—",
        location: `${user.city}${user.state ? ", " + user.state : ""}${
          user.country ? ", " + user.country : ""
        }`,
        languages: [user.motherTongue || "—"],
        lastSeen: "Recently",
        _id: user._id
      }));

      setMatches(cleaned);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingMatches(false);
    }
  }, [permanentlySkipped]); // connectedProfiles removed from dependencies

  useEffect(() => {
    if (activeTab === "Profile Match") {
      fetchAllMatches();
      setCurrentPage(1);
    }
  }, [activeTab, fetchAllMatches]);

  const removeProfile = (id: string) => {
    setMatches((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSendConnection = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      
      if (connectedProfiles.has(id)) {
        // Already connected, do nothing
        return;
      }

      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/request/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      // Mark as connected but keep profile visible
      setConnectedProfiles(prev => new Set(prev).add(id));
      toast.success("Connection request sent!");
      
    } catch (error: any) {
      if (error.message.includes("already sent")) {
        // Even if already sent, mark as connected for UI
        setConnectedProfiles(prev => new Set(prev).add(id));
        // Optionally show a neutral message or nothing
      } else {
        toast.error(" send connection request.");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleShortlist = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      if (likedProfiles.has(id)) {
        return;
      }

      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/like/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      setLikedProfiles(prev => new Set(prev).add(id));
      toast.success("Profile liked!");
      
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setLikedProfiles(prev => new Set(prev).add(id));
        // No toast for already liked, but you could show a subtle message
      } else {
        toast.error("Failed to like profile.");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/cross/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIdToBlock: id }),
      });

      if (!response.ok) return;

      setPermanentlySkipped(prev => new Set(prev).add(id));
      toast.success("Profile skipped!");
      removeProfile(id); // Remove immediately on skip
      
    } catch {
      // Silently fail
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

                    <p className="text-sm text-gray-500 border-b pb-1">
                      {profile.profileId} | Last seen {profile.lastSeen}
                    </p>

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
                          isConnected ? 'opacity-50 cursor-not-allowed' : ''
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
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'hover:border-red-300'
                        }`}
                      >
                        {isSendingLike[profile.id] ? (
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