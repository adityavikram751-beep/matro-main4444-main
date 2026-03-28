"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Send, Heart, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Loading from "../../../../Loading";

interface ProfilePhotoProps {
  activeTab: string;
}

// Updated interface to match the actual API response + optional display fields
interface Profile {
  _id: string;
  userId?: string;
  name: string;                 // from API
  image: string;                 // from API
  quote?: string;
  partnerName?: string;
  createdAt?: string;
  updatedAt?: string;
  // Optional fields used in UI (will be filled with defaults)
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  dateOfBirth?: string;
  height?: string;
  caste?: string;
  highestEducation?: string;
  annualIncome?: string;
  designation?: string;
  city?: string;
  state?: string;
  country?: string;
  motherTongue?: string;
  age?: string | number;
  education?: string;
  salary?: string;
  profession?: string;
  location?: string;
  languages?: string[];
  lastSeen?: string;
}

export default function ProfilePhoto({ activeTab }: ProfilePhotoProps) {
  const [profilesWithPhoto, setProfilesWithPhoto] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In‑memory UI state – no persistence across refreshes
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  // Since dateOfBirth is missing, we can't calculate age – set to "—"
  const calculateAge = () => "—";

  // FETCH PROFILES – adapted to real API response
  const fetchProfiles = useCallback(async () => {
    if (activeTab !== "Profile with photo") return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");

      const res = await fetch(
        "https://merimonial-backend.onrender.com/api/match/matches-with-profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch profiles");

      const responseData = await res.json();

      // Actual API returns { success, count, data: [...] }
      const apiProfiles = responseData.data || [];

      // Filter out permanently skipped profiles
      const filteredProfiles = apiProfiles.filter(
        (item: any) => !permanentlySkipped.has(item._id)
      );

      // Map API items to the Profile structure expected by the UI
      const cleaned = filteredProfiles.map((item: any) => ({
        _id: item._id,
        userId: item.userId,
        name: item.name || "—",
        image: item.image || "/default-avatar.png",
        quote: item.quote,
        partnerName: item.partnerName,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        // Fill UI display fields with defaults because API doesn't provide them
        firstName: item.name?.split(" ")[0] || item.name || "—",
        lastName: item.name?.split(" ").slice(1).join(" ") || "",
        profileImage: item.image || "-",
        age: calculateAge(),
        caste: "—",
        education: "—",
        salary: "—",
        profession: "—",
        location: "—",
        languages: ["—"],
        lastSeen: "Recently",
        height: "—",
        highestEducation: "—",
        annualIncome: "—",
        designation: "—",
        city: "—",
        state: "—",
        country: "—",
        motherTongue: "—",
        dateOfBirth: "",
      }));

      setProfilesWithPhoto(cleaned);
      setCurrentPage(1);
    } catch (error) {
      toast.error("Failed to load profiles");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, permanentlySkipped]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // REMOVE PROFILE (only used for skip)
  const removeProfile = (id: string) =>
    setProfilesWithPhoto((prev) => prev.filter((p) => p._id !== id));

  // ✅ CORRECTED: send connection request with receiverId (user ID)
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: id }), // ✅ now sends receiverId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send connection");
      }

      const data = await response.json();
      if (data.success) {
        setConnectedProfiles((prev) => new Set(prev).add(id));
        toast.success("Connection request sent!");
      } else {
        throw new Error(data.message || "Failed to send connection");
      }
    } catch (error: any) {
      if (error.message.includes("already sent")) {
        setConnectedProfiles((prev) => new Set(prev).add(id));
        toast.success("Connection request already sent!");
      } else {
        toast.error(error.message || "Failed to send connection");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // SHORTLIST (UPDATED: handle response properly)
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to shortlist");
      }

      const data = await response.json();
      if (data.success) {
        setLikedProfiles((prev) => new Set(prev).add(id));
        toast.success("Profile liked!");
      } else {
        throw new Error(data.message || "Failed to shortlist");
      }
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setLikedProfiles((prev) => new Set(prev).add(id));
        toast.success("Profile liked!");
      } else {
        toast.error(error.message || "Failed to shortlist");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // SKIP – UPDATED to /api/like/unlike with receiverId
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://merimonial-backend.onrender.com/api/like/unlike", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: id }), // ✅ now using receiverId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to skip profile");
      }

      const data = await response.json();
      if (data.success) {
        setPermanentlySkipped((prev) => new Set(prev).add(id));
        toast.success("Profile skipped!");
        removeProfile(id);
      } else {
        throw new Error(data.message || "Failed to skip profile");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to skip profile");
    }
  };

  if (activeTab !== "Profile with photo") return null;

  // PAGINATION
  const totalPages = Math.ceil(profilesWithPhoto.length / profilesPerPage);
  const indexLast = currentPage * profilesPerPage;
  const currentProfiles = profilesWithPhoto.slice(indexLast - profilesPerPage, indexLast);

  return (
    <div className="space-y-14 mt-0">
      {isLoading ? (
        <Loading message="Loading profiles..." />
      ) : currentProfiles.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          <p className="text-lg mb-2">No profiles with photos found.</p>
        </div>
      ) : (
        <>
          {currentProfiles.map((user) => {
            const isLiked = likedProfiles.has(user._id);
            const isConnected = connectedProfiles.has(user._id);

            return (
              <div
                key={user._id}
                className="p-6 bg-white rounded-lg border border-[#7D0A0A] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              >
                {/* IMAGE */}
                <div className="flex justify-center md:block">
                  <Image
                    src={user.image || "/default-avatar.png"}
                    alt={user.name}
                    width={96}
                    height={96}
                    className="w-28 h-28 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => router.push(`/matches/${user._id}`)}
                  />
                </div>

                {/* INFO */}
                <div className="flex-1 text-center md:text-left md:px-6 space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </h3>

                  <p className="text-sm text-gray-500 border-b pb-1">
                    {user._id.slice(-6)} | Last seen {user.lastSeen}
                  </p>

                  <p className="text-sm text-gray-700">
                    {user.age} Yrs · {user.height} · {user.caste}
                  </p>

                  <p className="text-sm text-gray-700">
                    {user.profession} · Earns {user.salary}
                  </p>

                  <p className="text-sm text-gray-700">{user.education}</p>
                  <p className="text-sm text-gray-700">{user.location}</p>
                  <p className="text-sm text-gray-700">{user.languages?.join(", ")}</p>
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
                        isConnected ? "opacity-50 cursor-not-allowed" : ""
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
                        isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:border-red-300"
                      }`}
                    >
                      {isSendingLike[user._id] ? (
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
                      onClick={() => handleNotNow(user._id)}
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
            <div className="flex justify-center gap-4 mt-6">
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

              <span className="font-medium">
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
          )}
        </>
      )}
    </div>
  );
}