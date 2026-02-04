"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Send, Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Loading from "../../../../Loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProfilePhotoProps {
  activeTab: string;
}

interface Profile {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  dateOfBirth: string;
  height: string;
  caste: string;
  highestEducation: string;
  annualIncome: string;
  designation: string;
  city: string;
  state: string;
  country: string;
  motherTongue: string;
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");

  // Track actions for each profile
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  
  // Store liked profiles
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('photoLikedProfiles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Permanently skipped profiles
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('photoSkipped');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Connected profiles
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('photoConnected');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  // Save states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('photoLikedProfiles', JSON.stringify(Array.from(likedProfiles)));
      localStorage.setItem('photoSkipped', JSON.stringify(Array.from(permanentlySkipped)));
      localStorage.setItem('photoConnected', JSON.stringify(Array.from(connectedProfiles)));
    }
  }, [likedProfiles, permanentlySkipped, connectedProfiles]);

  const calculateAge = (dob: string) => {
    if (!dob) return "—";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "—";
    return new Date().getFullYear() - d.getFullYear();
  };

  // FETCH PROFILES
  const fetchProfiles = useCallback(async () => {
    if (activeTab !== "Profile with photo") return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");

      const res = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/profile/with-photo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch profiles");

      const data = await res.json();

      // Filter out skipped and connected profiles
      const filteredProfiles = (data.photo || []).filter((u: Profile) => 
        !permanentlySkipped.has(u._id) && !connectedProfiles.has(u._id)
      );

      const cleaned = filteredProfiles.map((u: Profile) => ({
        ...u,
        age: calculateAge(u.dateOfBirth),
        caste: u.caste || "—",
        education: u.highestEducation || "—",
        salary: u.annualIncome || "—",
        profession: u.designation || "—",
        location: [u.city, u.state, u.country].filter(Boolean).join(", ") || "—",
        languages: u.motherTongue ? [u.motherTongue] : ["—"],
        lastSeen: "Recently",
      }));

      setProfilesWithPhoto(cleaned);
      setCurrentPage(1);
    } catch {
      toast.error("Failed to load profiles");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, permanentlySkipped, connectedProfiles]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // REMOVE PROFILE
  const removeProfile = (id: string) =>
    setProfilesWithPhoto((prev) => prev.filter((p) => p._id !== id));

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
          "Content-Type": "application/json",
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
          "Content-Type": "application/json",
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

  // SKIP
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("https://matrimonial-backend-7ahc.onrender.com/api/cross/user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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

  // Clear all skipped profiles
  const clearSkippedProfiles = () => {
    setPermanentlySkipped(new Set());
    localStorage.removeItem('photoSkipped');
    toast.success("Skipped profiles cleared");
    fetchProfiles();
  };

  if (activeTab !== "Profile with photo") return null;

  // PAGINATION
  const totalPages = Math.ceil(profilesWithPhoto.length / profilesPerPage);
  const indexLast = currentPage * profilesPerPage;
  const currentProfiles = profilesWithPhoto.slice(
    indexLast - profilesPerPage,
    indexLast
  );

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

        {isLoading ? (
          <Loading message="Loading profiles..." />
        ) : currentProfiles.length === 0 ? (
          <div className="text-center text-gray-600 py-10">
            <p className="text-lg mb-2">No profiles with photos found.</p>
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
            {currentProfiles.map((user) => {
              const isLiked = likedProfiles.has(user._id);
              
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
                      {user.id || user._id} | Last seen {user.lastSeen}
                    </p>

                    <p className="text-sm text-gray-700">
                      {user.age} Yrs · {user.height} · {user.caste}
                    </p>

                    <p className="text-sm text-gray-700">
                      {user.profession} · Earns {user.salary}
                    </p>

                    <p className="text-sm text-gray-700">{user.education}</p>
                    <p className="text-sm text-gray-700">{user.location}</p>
                    <p className="text-sm text-gray-700">
                      {user.languages?.join(", ")}
                    </p>
                  </div>

                  {/* ACTION BUTTONS — RESPONSIVE GRID */}
                  <div
                    className="
                    grid grid-cols-3 md:grid-cols-1 gap-4
                    items-center text-center md:text-left md:border-l md:pl-4
                  "
                  >
                    {/* Connection */}
                    <div className="flex flex-col items-center md:flex-row gap-2">
                      <span className="text-sm">Connect</span>
                      <Button
                        disabled={isSendingConnection[user._id]}
                        onClick={() => handleSendConnection(user._id)}
                        className="bg-gradient-to-r from-green-400 to-blue-400 text-white w-10 h-10 rounded-full hover:opacity-90"
                      >
                        {isSendingConnection[user._id] ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Shortlist */}
                    <div className="flex flex-col items-center md:flex-row gap-2">
                      <span className="text-sm">Like</span>
                      <Button
                        variant={isLiked ? "default" : "outline"}
                        disabled={isSendingLike[user._id] || isLiked}
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

                    {/* Not now */}
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
          </>
        )}
      </div>
    </>
  );
}