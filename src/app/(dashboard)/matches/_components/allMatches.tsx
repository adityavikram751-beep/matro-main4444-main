"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Send, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "../../../../Loading";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");

  // Track actions for each profile
  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(() => {
    // Load liked profiles from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('likedProfiles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // PERMANENTLY SKIPPED/BLOCKED PROFILES
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skippedMatches');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // CONNECTED PROFILES (so we don't show them again)
  const [connectedProfiles, setConnectedProfiles] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('connectedProfiles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const router = useRouter();

  // Save states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('likedProfiles', JSON.stringify(Array.from(likedProfiles)));
      localStorage.setItem('skippedMatches', JSON.stringify(Array.from(permanentlySkipped)));
      localStorage.setItem('connectedProfiles', JSON.stringify(Array.from(connectedProfiles)));
    }
  }, [likedProfiles, permanentlySkipped, connectedProfiles]);

  const calculateAge = (dob: string) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "—";
    return new Date().getFullYear() - birthDate.getFullYear();
  };

  const fetchAllMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found.");

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

      if (!response.ok) throw new Error("Failed to fetch matches");

      const data = await response.json();
      if (!data.success || !data.users) throw new Error("Invalid response format");

      // Filter out skipped and connected profiles
      const filteredUsers = data.users.filter((user: any) => 
        !permanentlySkipped.has(user._id) && !connectedProfiles.has(user._id)
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
      toast.error("Failed to load matches");
    } finally {
      setIsLoadingMatches(false);
    }
  }, [permanentlySkipped, connectedProfiles]);

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
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      
      // Change heart to red immediately
      // (Already handled by likedProfiles state)
      
    } catch (error: any) {
      if (error.message.includes("already liked")) {
        setDialogTitle("Already Shortlisted");
        setDialogMessage("This profile is already in your shortlist.");
        setDialogOpen(true);
        setLikedProfiles(prev => new Set(prev).add(id));
      } else {
        toast.error(error.message || "Failed to shortlist");
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

  // Clear all skipped profiles (optional)
  const clearSkippedProfiles = () => {
    setPermanentlySkipped(new Set());
    localStorage.removeItem('skippedMatches');
    toast.success("Skipped profiles cleared");
    fetchAllMatches();
  };

  const totalPages = Math.ceil(matches.length / profilesPerPage);
  const indexOfLast = currentPage * profilesPerPage;
  const indexOfFirst = indexOfLast - profilesPerPage;
  const currentMatches = matches.slice(indexOfFirst, indexOfLast);

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

      {activeTab !== "Profile Match" ? null : (
        <div className="space-y-6 mt-0">
          {/* HEADER WITH STATS */}
          <div className="flex justify-between items-center mb-4">
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
            
            <div className="text-sm text-gray-600">
            </div>
          </div>

          {isLoadingMatches ? (
            <Loading message="Loading matches..." />
          ) : currentMatches.length > 0 ? (
            currentMatches.map((profile) => {
              const isLiked = likedProfiles.has(profile.id);
              
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

                  <div className="grid grid-cols-3 md:grid-cols-1 gap-4 items-center text-center md:text-left 
                  md:border-l md:pl-4">

                    {/* Connection Button */}
                    <div className="flex flex-col items-center md:flex-row gap-2">
                      <span className="text-sm">Connect</span>
                      <Button
                        disabled={isSendingConnection[profile.id]}
                        onClick={() => handleSendConnection(profile.id)}
                        className="bg-gradient-to-r from-green-400 to-blue-400 text-white w-10 h-10 rounded-full hover:opacity-90"
                      >
                        {isSendingConnection[profile.id] ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Shortlist Button - RED when liked */}
                    <div className="flex flex-col items-center md:flex-row gap-2">
                      <span className="text-sm">Like</span>
                      <Button
                        variant={isLiked ? "default" : "outline"}
                        disabled={isSendingLike[profile.id] || isLiked}
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

                    {/* Skip Button */}
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
          )}

          {/* PAGINATION */}
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

              <div className="text-sm text-gray-500">
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}