'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import ProfilePreferenceForm from './Preference';

interface PreferenceData {
  gender: string;
  minAge: number;
  maxAge: number;
  minHeight: number;
  maxHeight: number;
  minWeight: number;
  maxWeight: number;
  religion: string;
  caste: string;
  community: string;
  maritalStatus: string;
  designation: string;
  gotra: string;
  highestEducation: string;
  income: string;
  state: string;
  city: string;
}

const BANNER_API = 'https://merimonial-backend.onrender.com/api/banner/access/banner-image';

const Hero: React.FC = () => {
  const [lookingFor, setLookingFor] = useState('Women');
  const [ageFrom, setAgeFrom] = useState(22);
  const [ageTo, setAgeTo] = useState(27);
  const [religion, setReligion] = useState('Hindu');
  const [motherTongue, setMotherTongue] = useState('English');
  const [showPreferenceForm, setShowPreferenceForm] = useState(false);

  // ── Banner image state ──────────────────────────────────────────────────
  const [bannerImage, setBannerImage] = useState<string>('/assets/heroimage.png');
  const [bannerLoading, setBannerLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await fetch(BANNER_API);
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          setBannerImage(json.data[0].image);
        }
      } catch (err) {
        console.error('Banner fetch failed:', err);
        // fallback stays as default
      } finally {
        setBannerLoading(false);
      }
    };
    fetchBanner();
  }, []);

  const handleDetailedPreferences = () => setShowPreferenceForm(true);

  const handlePreferenceSubmit = async (preferenceData: PreferenceData) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found. Please log in again.');

      const response = await fetch('https://merimonial-backend.onrender.com/api/partner/preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferenceData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save preferences');
      }

      const result = await response.json();
      console.log('Preferences saved successfully:', result);
      setShowPreferenceForm(false);
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handlePreferenceCancel = () => setShowPreferenceForm(false);

  // ── Shared banner image JSX ─────────────────────────────────────────────
  const BannerImage = ({ className }: { className?: string }) => (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {bannerLoading ? (
        // Skeleton loader while fetching
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      ) : (
        <Image
          src={bannerImage}
          alt="hero banner"
          fill
          className="object-cover"
          priority
          unoptimized // needed for external Cloudinary URLs
        />
      )}
    </div>
  );

  return (
    <>
      {/* HERO SECTION GRID */}
      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT TEXT SIDE */}
        <div className="flex items-center justify-center px-6 lg:px-16 py-16 lg:py-24">
          <div className="w-full lg:w-[90%]">
            <h1 className="text-4xl lg:text-5xl font-medium text-[#343434] leading-tight font-Lato text-center lg:text-left">
              A Pure Path to Marriage — <br className="hidden lg:flex" />
              With Love and Trust at Heart
            </h1>
            <p className="text-base lg:text-xl font-light text-[#757575] mt-6 font-Lato text-center lg:text-left">
              This is more than just a matrimonial app. It's a heartfelt journey toward companionship,
              built on honesty, care, and community — without pressure or payment.
            </p>
          </div>
        </div>

        {/* RIGHT IMAGE SIDE — Desktop (hidden on mobile) */}
        <div className="hidden lg:block relative w-full h-auto">
          <BannerImage />
        </div>

        {/* RIGHT IMAGE SIDE — Mobile (shown on mobile only) */}
        <div className="block lg:hidden relative w-full h-[300px]">
          <BannerImage />
        </div>

        {/* MOBILE FORM */}
        <div className="block lg:hidden w-full px-6 mt-6">
          <div className="flex flex-col gap-4 bg-white p-5 shadow-xl border border-gray-200 rounded-md">

            <div className="flex flex-col">
              <label className="text-sm mb-1 font-medium text-[#757575]">I'm looking for a</label>
              <select
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                className="border-[#6F0000] border p-2 text-md rounded font-Mulish"
              >
                <option>Women</option>
                <option>Men</option>
              </select>
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#757575]">Age</label>
                <input
                  type="number"
                  value={ageFrom}
                  onChange={(e) => setAgeFrom(Number(e.target.value))}
                  className="border border-[#6F0000] p-2 rounded w-20 font-Mulish"
                />
              </div>
              <span className="pb-2 font-medium">to</span>
              <div className="flex flex-col">
                <label className="invisible">Age</label>
                <input
                  type="number"
                  value={ageTo}
                  onChange={(e) => setAgeTo(Number(e.target.value))}
                  className="border border-[#6F0000] p-2 rounded w-20 font-Mulish"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm mb-1 font-medium text-[#757575]">Of Religion</label>
              <select
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="border-[#6F0000] border p-2 rounded font-Mulish"
              >
                <option>Hindu</option>
                <option>Muslim</option>
                <option>Christian</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm mb-1 font-medium text-[#757575]">And Mother Tongue</label>
              <select
                value={motherTongue}
                onChange={(e) => setMotherTongue(e.target.value)}
                className="border-[#6F0000] border p-2 rounded font-Mulish"
              >
                <option>English</option>
                <option>Hindi</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleDetailedPreferences}
              className="bg-white text-[#7D0A0A] border-2 border-[#7D0A0A] w-full py-3 rounded text-md font-semibold font-Mulish shadow hover:bg-[#7D0A0A] hover:text-white transition"
            >
              Set Detailed Preferences
            </button>
          </div>
        </div>

        {/* DESKTOP FORM */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-[460px] z-20 w-full max-w-5xl px-4">
          <div className="flex flex-col bg-white px-8 py-6 shadow-2xl border border-gray-200 w-full rounded-md">
            <div className="flex items-center justify-between gap-6 w-full flex-wrap">

              <div className="flex flex-col">
                <label className="text-sm mb-1 font-medium">I'm looking for a</label>
                <select
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="border-[#6F0000] border p-2 rounded min-w-[130px]"
                >
                  <option>Women</option>
                  <option>Men</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="text-sm mb-1 font-medium">Age</label>
                  <input
                    type="number"
                    value={ageFrom}
                    onChange={(e) => setAgeFrom(Number(e.target.value))}
                    className="border border-[#6F0000] p-2 rounded w-16"
                  />
                </div>
                <span className="pb-2">to</span>
                <div className="flex flex-col">
                  <label className="invisible">Age</label>
                  <input
                    type="number"
                    value={ageTo}
                    onChange={(e) => setAgeTo(Number(e.target.value))}
                    className="border border-[#6F0000] p-2 rounded w-16"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm mb-1 font-medium">Of Religion</label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="border-[#6F0000] border p-2 rounded min-w-[130px]"
                >
                  <option>Hindu</option>
                  <option>Muslim</option>
                  <option>Christian</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm mb-1 font-medium">Mother Tongue</label>
                <select
                  value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)}
                  className="border-[#6F0000] border p-2 rounded min-w-[130px]"
                >
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </div>

              <button
                onClick={handleDetailedPreferences}
                className="bg-[#7D0A0A] text-white border-2 border-[#7B0A0A] px-10 py-3 rounded shadow-md hover:bg-[#6A0808] transition"
              >
                Set Preferences
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* PREFERENCE FORM POPUP */}
      {showPreferenceForm && (
        <ProfilePreferenceForm
          onSubmit={handlePreferenceSubmit}
          onCancel={handlePreferenceCancel}
          initialData={{
            gender: lookingFor === 'Women' ? 'Female' : 'Male',
            minAge: ageFrom,
            maxAge: ageTo,
            minHeight: 150,
            maxHeight: 200,
            minWeight: 40,
            maxWeight: 100,
            religion,
            caste: '',
            community: motherTongue,
            maritalStatus: 'Never Married',
            designation: '',
            gotra: '',
            highestEducation: '',
            income: '',
            state: '',
            city: '',
          }}
        />
      )}
    </>
  );
};

export default Hero;