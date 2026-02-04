"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Send, Heart, X } from "lucide-react";
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

  const [isSendingConnection, setIsSendingConnection] = useState<Record<string, boolean>>({});
  const [isSendingLike, setIsSendingLike] = useState<Record<string, boolean>>({});

  const router = useRouter();

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;

  // PERMANENTLY SKIPPED PROFILES (LocalStorage में save)
  const [permanentlySkipped, setPermanentlySkipped] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skippedProfiles');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // LocalStorage में save करें जब skipped profiles change हो
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('skippedProfiles', JSON.stringify(Array.from(permanentlySkipped)));
    }
  }, [permanentlySkipped]);

  // FETCH NEW USERS
  const fetchNewUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      setIsLoading(true);

      const response = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/profile/newly-user",
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
      
      // PERMANENTLY skipped profiles filter करें
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

  // REMOVE PROFILE PERMANENTLY
  const removeProfile = (id: string) => {
    // Local state से remove
    setNewlyMatched((prev) => prev.filter((u) => u._id !== id));
    
    // Permanently skip के लिए LocalStorage में save करें
    setPermanentlySkipped((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    
    // Reset pagination if needed
    if (newlyMatched.length <= 1) {
      setCurrentPage(1);
    }
  };

  // ACTION: SEND CONNECTION
  const handleSendConnection = async (id: string) => {
    try {
      setIsSendingConnection((prev) => ({ ...prev, [id]: true }));

      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/request/send",
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

      toast.success("Connection request sent");
      removeProfile(id);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to send connection");
      setIsSendingConnection((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ACTION: SHORTLIST
  const handleShortlist = async (id: string) => {
    try {
      setIsSendingLike((prev) => ({ ...prev, [id]: true }));

      const token = localStorage.getItem("authToken");
      const response = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/like/send",
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

      toast.success("Shortlisted");
      removeProfile(id);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to shortlist");
      setIsSendingLike((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ACTION: NOT NOW (SKIP PERMANENTLY)
  const handleNotNow = async (id: string) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        "https://matrimonial-backend-7ahc.onrender.com/api/cross/user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userIdToBlock: id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to skip profile");
      }

      toast.success("Profile skipped permanently");
      removeProfile(id);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to skip profile");
    }
  };

  // REFRESH BUTTON
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

  // CLEAR SKIPPED PROFILES (Optional - for testing)
  const clearSkippedProfiles = () => {
    setPermanentlySkipped(new Set());
    localStorage.removeItem('skippedProfiles');
    toast.success("Skipped profiles cleared");
    fetchNewUsers();
  };

  if (activeTab !== "New Profile") return null;

  // PAGINATION
  const totalPages = Math.ceil(newlyMatched.length / profilesPerPage);
  const indexLast = currentPage * profilesPerPage;
  const indexFirst = indexLast - profilesPerPage;
  const currentProfiles = newlyMatched.slice(indexFirst, indexLast);

  return (
    <div className="space-y-6 mt-0">
      {/* REFRESH BUTTON */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Skipped Profiles: {permanentlySkipped.size}
          {permanentlySkipped.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSkippedProfiles}
              className="ml-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          {isRefreshing ? (
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      {/* LOADING */}
      {isLoading ? (
        <Loading message="Loading new profiles..." />
      ) : currentProfiles.length === 0 ? (
        <div className="text-center text-gray-600 py-8">
          <p>No new profiles found.</p>
          <div className="mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="mt-2"
            >
              Refresh
            </Button>
            {permanentlySkipped.size > 0 && (
              <Button
                variant="ghost"
                onClick={clearSkippedProfiles}
                className="mt-2"
              >
                Clear Skipped Profiles
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {currentProfiles.map((user) => (
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
                {/* Connection */}
                <div className="flex flex-col items-center md:flex-row gap-2">
                  <span className="text-sm">Connect</span>
                  <Button
                    disabled={isSendingConnection[user._id]}
                    onClick={() => handleSendConnection(user._id)}
                    className="bg-gradient-to-r from-green-400 to-blue-400 text-white w-10 h-10 rounded-full"
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
                    variant="outline"
                    disabled={isSendingLike[user._id]}
                    onClick={() => handleShortlist(user._id)}
                    className="w-10 h-10 rounded-full"
                  >
                    {isSendingLike[user._id] ? (
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 text-red-600" />
                    )}
                  </Button>
                </div>

                {/* Not Now */}
                <div className="flex flex-col items-center md:flex-row gap-2">
                  <span className="text-sm">Skip</span>
                  <Button
                    variant="outline"
                    onClick={() => handleNotNow(user._id)}
                    className="bg-gray-200 w-10 h-10 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

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