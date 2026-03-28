"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Send, Heart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MutualMatchesProps {
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

export default function MutualMatches({ activeTab }: MutualMatchesProps) {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ currentUserId — JWT se decode hoga automatically
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(new Set());
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  // ✅ STEP 1: Mount hote hi userId nikalo — localStorage ya JWT se
  useEffect(() => {
    // Pehle direct localStorage se try karo
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setCurrentUserId(storedId);
      return;
    }
    // Nahi mila toh JWT token decode karo
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const id = payload.id || payload._id || payload.userId || payload.sub;
        if (id) setCurrentUserId(String(id));
      }
    } catch {
      // Token decode nahi hua — silently ignore
    }
  }, []);

  const calculateAge = (dob: string) => {
    if (!dob) return "—";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "—";
    return new Date().getFullYear() - d.getFullYear();
  };

  // ✅ STEP 2: GET /api/match/user-mutual-profiles?userId=<currentUserId>
  const fetchMutualMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      setIsLoading(true);

      // userId query param mein daal do
      const params = new URLSearchParams();
      if (currentUserId) params.append("userId", currentUserId);

      const res = await fetch(
        `https://merimonial-backend.onrender.com/api/match/user-mutual-profiles?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      const filteredMatches = data.mutualMatches.filter(
        (u: any) => !permanentlySkipped.has(u._id)
      );

      const formatted = filteredMatches.map((u: any) => ({
        id: u._id,
        profileId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        image: u.profileImage || "/no-img.png",
        age: calculateAge(u.dateOfBirth),
        height: u.height || "—",
        caste: u.caste || "—",
        profession: u.designation || "—",
        salary: u.annualIncome || "—",
        education: u.highestEducation || "—",
        location: `${u.city || ""}${u.state ? ", " + u.state : ""}${
          u.country ? ", " + u.country : ""
        }`,
        languages: [u.motherTongue || "—"],
        lastSeen: "Recently",
      }));

      setMatches(formatted);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [permanentlySkipped, currentUserId]);

  useEffect(() => {
    if (activeTab === "Mutual Match") {
      fetchMutualMatches();
      setCurrentPage(1);
    }
  }, [activeTab, fetchMutualMatches]);

  const removeProfile = (id: string) => {
    setMatches((prev) => prev.filter((p) => p.id !== id));
  };

  // ✅ STEP 3: Send Connection — body mein receiverId + userId
  const handleSendConnection = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (connectedProfiles.has(id)) return;

      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/request/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiverId: id,
            ...(currentUserId && { userId: currentUserId }), // ✅ userId body mein
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      setConnectedProfiles((prev) => new Set(prev).add(id));
      toast.success("Connection request sent!");
    } catch (error: any) {
      if (error.message?.includes("already sent")) {
        setConnectedProfiles((prev) => new Set(prev).add(id));
      } else {
        toast.error("Failed to send connection request.");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ✅ STEP 4: Like — body mein receiverId + userId
  const handleShortlist = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (likedProfiles.has(id)) return;

      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const response = await fetch(
        "https://merimonial-backend.onrender.com/api/like/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiverId: id,
            ...(currentUserId && { userId: currentUserId }), // ✅ userId body mein
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed");
      }

      setLikedProfiles((prev) => new Set(prev).add(id));
      toast.success("Profile liked!");
    } catch (error: any) {
      if (error.message?.includes("already liked")) {
        setLikedProfiles((prev) => new Set(prev).add(id));
      } else {
        toast.error("Failed to like profile.");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ✅ STEP 5: Skip — now uses /api/like/unlike with receiverId
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
          body: JSON.stringify({
            receiverId: id,
            ...(currentUserId && { userId: currentUserId }), // optional userId
          }),
        }
      );

      if (!response.ok) return;

      const result = await response.json();
      if (result.success) {
        setPermanentlySkipped((prev) => new Set(prev).add(id));
        toast.success("Profile skipped!");
        removeProfile(id);
      }
    } catch {
      // Silently fail
    }
  };

  const totalPages = Math.ceil(matches.length / profilesPerPage);
  const indexLast = currentPage * profilesPerPage;
  const indexFirst = indexLast - profilesPerPage;
  const currentProfiles = matches.slice(indexFirst, indexLast);

  if (activeTab !== "Mutual Match") return null;

  return (
    <div className="space-y-14 mt-0">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin" />
        </div>
      ) : currentProfiles.length > 0 ? (
        currentProfiles.map((profile) => {
          const isLiked = likedProfiles.has(profile.id);
          const isConnected = connectedProfiles.has(profile.id);

          return (
            <div
              key={profile.id}
              className="p-6 bg-white rounded-lg border border-[#7D0A0A] shadow-sm
              flex flex-col md:flex-row md:items-center md:justify-between gap-6"
            >
              {/* IMAGE */}
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

              {/* INFO */}
              <div className="flex-1 text-center md:text-left md:px-6">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <p className="text-sm text-gray-500 border-b mt-1 pb-1">
                  {profile.profileId} | Last seen {profile.lastSeen}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {profile.age} Yrs · {profile.height} · {profile.caste}
                </p>
                <p className="text-sm text-gray-700">
                  {profile.profession} · Earns {profile.salary}
                </p>
                <p className="text-sm text-gray-700">{profile.education}</p>
                <p className="text-sm text-gray-700">{profile.location}</p>
                <p className="text-sm text-gray-700">{profile.languages.join(", ")}</p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-3 md:grid-cols-1 gap-4 items-center text-center md:text-left md:border-l md:pl-4">
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
          <p className="text-lg mb-2">No mutual matches found.</p>
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={`px-5 py-2 text-white rounded ${
              currentPage === 1
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#219e25] hover:bg-[#1b7f1e]"
            }`}
          >
            Previous
          </button>

          <span>Page {currentPage} of {totalPages}</span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={`px-5 py-2 text-white rounded ${
              currentPage === totalPages
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#219e25] hover:bg-[#1b7f1e]"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}