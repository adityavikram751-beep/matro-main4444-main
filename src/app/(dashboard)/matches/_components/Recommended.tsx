"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Send, Heart, X } from "lucide-react";
import Loading from "../../../../Loading";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RecommendationProps {
  activeTab: string;
}

interface RecommendedProfile {
  _id: string;
  name: string;
  age: number;
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
}

export default function Recommendation({ activeTab }: RecommendationProps) {
  const [profiles, setProfiles] = useState<RecommendedProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");

  // Track actions for each profile
  const [isSendingConnection, setIsSendingConnection] = useState<{ [key: string]: boolean }>({});
  const [isSendingLike, setIsSendingLike] = useState<{ [key: string]: boolean }>({});
  
  // Store liked profiles
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recommendationLikedProfiles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Permanently skipped profiles
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recommendationSkipped');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Connected profiles
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recommendationConnected');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  const router = useRouter();

  // Save states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recommendationLikedProfiles', JSON.stringify(Array.from(likedProfiles)));
      localStorage.setItem('recommendationSkipped', JSON.stringify(Array.from(permanentlySkipped)));
      localStorage.setItem('recommendationConnected', JSON.stringify(Array.from(connectedProfiles)));
    }
  }, [likedProfiles, permanentlySkipped, connectedProfiles]);

  const fetchProfiles = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");

      setLoading(true);

      const res = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/partner/match", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch recommendations");

      const data = await res.json();

      if (!data.success || !data.users) throw new Error("Invalid response format");

      // Filter out skipped and connected profiles
      const filteredUsers = data.users.filter((p: any) => 
        !permanentlySkipped.has(p._id) && !connectedProfiles.has(p._id)
      );

      const cleaned = filteredUsers.map((p: any) => {
        const dob = new Date(p.dateOfBirth);
        const age = isNaN(dob.getTime())
          ? 0
          : new Date().getFullYear() - dob.getFullYear();

        return {
          _id: p._id,
          id: p.id || p._id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          age,
          location: [p.city, p.state, p.country].filter(Boolean).join(", ") || "—",
          profileImage: p.profileImage || "/default-avatar.png",
          height: p.height || "—",
          religion: p.religion || "—",
          profession: p.designation || "—",
          salary: p.annualIncome || "—",
          education: p.highestEducation || "—",
          languages: p.motherTongue ? [p.motherTongue] : ["—"],
          lastSeen: "Recently",
        };
      });

      setProfiles(cleaned);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [permanentlySkipped, connectedProfiles]);

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

  // Clear all skipped profiles
  const clearSkippedProfiles = () => {
    setPermanentlySkipped(new Set());
    localStorage.removeItem('recommendationSkipped');
    toast.success("Skipped profiles cleared");
    fetchProfiles();
  };

  // SEND CONNECTION
  const handleSendConnection = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Check if already connected
      if (connectedProfiles.has(id)) {
        setDialogTitle("Already Connected");
        setDialogMessage("You have already sent a connection request to this profile.");
        setDialogOpen(true);
        return;
      }

      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/request/send", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ receiverId: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send connection");
      }

      // Add to connected profiles
      setConnectedProfiles(prev => new Set(prev).add(id));
      
      toast.success("Connection request sent successfully!");
      removeProfile(id);
      
    } catch (error: any) {
      if (error.message.includes("already sent")) {
        setDialogTitle("Already Connected");
        setDialogMessage("You have already sent a connection request to this profile.");
        setDialogOpen(true);
        // Add to connected profiles anyway
        setConnectedProfiles(prev => new Set(prev).add(id));
        removeProfile(id);
      } else {
        toast.error(error.message || "Failed to send connection");
      }
    } finally {
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // SHORTLIST
  const handleShortlist = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      // Check if already liked
      if (likedProfiles.has(id)) {
        setDialogTitle("Already Shortlisted");
        setDialogMessage("This profile is already in your shortlist.");
        setDialogOpen(true);
        return;
      }

      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/like/send", {
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

      // Mark as liked
      setLikedProfiles(prev => new Set(prev).add(id));
      
      toast.success("Profile added to shortlist!");
      removeProfile(id);
      
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setDialogTitle("Already Shortlisted");
        setDialogMessage("This profile is already in your shortlist.");
        setDialogOpen(true);
        setLikedProfiles(prev => new Set(prev).add(id));
        removeProfile(id);
      } else {
        toast.error(error.message || "Failed to shortlist");
      }
    } finally {
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // NOT NOW
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/cross/user", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ userIdToBlock: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to skip profile");
      }

      // Permanently skip
      setPermanentlySkipped(prev => new Set(prev).add(id));
      
      toast.success("Profile skipped permanently");
      removeProfile(id);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to skip profile");
    }
  };

  if (activeTab !== "Preference") return null;

  return (
    <>
      {/* DIALOG BOX FOR ALREADY CONNECTED/LIKED */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{dialogTitle}</DialogTitle>
            <DialogDescription className="pt-2">
              {dialogMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(false)} className="mt-4">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-14 mt-0">
        {/* HEADER WITH STATS */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {permanentlySkipped.size > 0 && (
              <span>
                Skipped: {permanentlySkipped.size}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSkippedProfiles}
                  className="ml-2 text-xs"
                >
                  Clear All
                </Button>
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <Loading message="Loading recommended profiles..." />
        ) : currentData.length === 0 ? (
          <div className="text-center text-gray-600 py-10">
            <p className="text-lg mb-2">No recommendations found.</p>
            {permanentlySkipped.size > 0 && (
              <Button
                variant="outline"
                onClick={clearSkippedProfiles}
                className="mt-2"
              >
                Clear Skipped Profiles
              </Button>
            )}
          </div>
        ) : (
          <>
            {currentData.map((p) => {
              const isLiked = likedProfiles.has(p._id);
              
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

                  {/* ACTION BUTTONS — RESPONSIVE GRID */}
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
                        disabled={isSendingConnection[p._id]}
                        onClick={() => handleSendConnection(p._id)}
                        className="bg-gradient-to-r from-green-400 to-blue-400 text-white w-10 h-10 rounded-full hover:opacity-90"
                      >
                        {isSendingConnection[p._id] ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                        disabled={isSendingLike[p._id] || isLiked}
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
    </>
  );
}