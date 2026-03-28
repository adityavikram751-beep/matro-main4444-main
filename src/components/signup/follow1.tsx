'use client';

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';

type Follow1FormProps = {
  profileFor?: string;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  gender: string;
  setGender: (value: string) => void;
  email: string;
  age: string;
  setAge: (value: string) => void;
  setEmail: (value: string) => void;
  mobileNumber: string;
  setMobileNumber: (value: string) => void;
  onBack: () => void;
  handleContinueFollow2: () => void;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhoneNumber = (number: string) => /^\d{10}$/.test(number);

export default function Follow1Form({
  profileFor,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  gender,
  setGender,
  age,
  setAge,
  email,
  setEmail,
  mobileNumber,
  setMobileNumber,
  onBack,
  handleContinueFollow2,
}: Follow1FormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleMobileChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(digits);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    if (type === 'front') {
      setAadhaarFront(file);
      const reader = new FileReader();
      reader.onloadend = () => setFrontPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAadhaarBack(file);
      const reader = new FileReader();
      reader.onloadend = () => setBackPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    setError('');
  };

  const removeImage = (type: 'front' | 'back') => {
    if (type === 'front') {
      setAadhaarFront(null);
      setFrontPreview(null);
    } else {
      setAadhaarBack(null);
      setBackPreview(null);
    }
  };

  const handleRegister = async () => {
    if (!firstName?.trim() || !lastName?.trim() || !mobileNumber?.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isValidPhoneNumber(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (email && !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();

    // ✅ FIXED: 'firstName' capital N - Postman se match
    formData.append('firstName', firstName.trim());
    formData.append('lastName', lastName.trim());
    formData.append('gender', gender?.trim() || '');
    formData.append('age', age);
    formData.append('mobile', mobileNumber);
    if (email?.trim()) formData.append('email', email.trim());
    if (profileFor?.trim()) formData.append('profileFor', profileFor.trim());
    formData.append('role', 'user');

    if (aadhaarFront) formData.append('adhaarCardFrontImage', aadhaarFront);
    if (aadhaarBack) formData.append('adhaarCardBackImage', aadhaarBack);

    console.log('Sending FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    try {
      const res = await fetch('https://merimonial-backend.onrender.com/auth/otp-request', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned ${res.status}: ${text.substring(0, 200)}`);
      }

      console.log('Response:', data);

      if (res.ok && data.success) {
        if (data.otp) {
          localStorage.setItem('registrationOtp', data.otp);
          localStorage.setItem('registrationMobile', mobileNumber);
        }
        if (data.token) localStorage.setItem('authToken', data.token);
        handleContinueFollow2();
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Network error:', err);
      setError(err.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-h-full overflow-y-auto px-0">
      <div className="flex items-center space-x-1 mb-1">
        <button onClick={onBack} type="button" aria-label="Back" className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Create profile</h2>
          {profileFor && <p className="text-[10px] text-gray-500">Profile for: {profileFor}</p>}
        </div>
      </div>

      {error && (
        <div className="mb-2 p-1.5 bg-red-50 border border-red-200 rounded-md">
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-700 mb-0.5 block">First Name *</Label>
            <Input
              placeholder="First"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading}
              className="bg-white h-8 text-xs px-2"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-700 mb-0.5 block">Last Name *</Label>
            <Input
              placeholder="Last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
              className="bg-white h-8 text-xs px-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-gray-700 mb-0.5 block">Gender *</Label>
            <Input
              placeholder="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isLoading}
              className="bg-white h-8 text-xs px-2"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-700 mb-0.5 block">Age *</Label>
            <Input
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={isLoading}
              className="bg-white h-8 text-xs px-2"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-gray-700 mb-0.5 block">Email</Label>
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="bg-white h-8 text-xs px-2"
          />
        </div>

        <div>
          <Label className="text-[11px] text-gray-700 mb-0.5 block">Mobile Number *</Label>
          <Input
            placeholder="10-digit mobile"
            value={mobileNumber}
            onChange={(e) => handleMobileChange(e.target.value)}
            disabled={isLoading}
            className="bg-white h-8 text-xs px-2"
          />
          <p className="text-[9px] text-gray-500 mt-0.5">Enter 10-digit mobile number</p>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-gray-700 block">Aadhaar Card Images (Optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-gray-500 block mb-0.5">Front Side</Label>
              {frontPreview ? (
                <div className="relative border rounded-md overflow-hidden h-16 w-full">
                  <Image src={frontPreview} alt="Aadhaar Front" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage('front')}
                    className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-16 border border-dashed rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <span className="text-[10px] text-gray-500">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'front')}
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>

            <div>
              <Label className="text-[10px] text-gray-500 block mb-0.5">Back Side</Label>
              {backPreview ? (
                <div className="relative border rounded-md overflow-hidden h-16 w-full">
                  <Image src={backPreview} alt="Aadhaar Back" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage('back')}
                    className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-16 border border-dashed rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <span className="text-[10px] text-gray-500">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'back')}
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>
          </div>
          <p className="text-[9px] text-gray-500">Upload clear images (max 5MB each)</p>
        </div>

        <Button
          onClick={handleRegister}
          disabled={isLoading}
          size="sm"
          className="w-full bg-rose-700 hover:bg-rose-800 text-white py-1.5 font-medium text-xs shadow transition-all mt-0.5"
        >
          {isLoading ? 'Sending OTP...' : 'Register Now'}
        </Button>
      </div>
    </div>
  );
}

Follow1Form.propTypes = {
  profileFor: PropTypes.string,
  firstName: PropTypes.string.isRequired,
  setFirstName: PropTypes.func.isRequired,
  lastName: PropTypes.string.isRequired,
  setLastName: PropTypes.func.isRequired,
  gender: PropTypes.string.isRequired,
  setGender: PropTypes.func.isRequired,
  age: PropTypes.string.isRequired,
  setAge: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  setEmail: PropTypes.func.isRequired,
  mobileNumber: PropTypes.string.isRequired,
  setMobileNumber: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  handleContinueFollow2: PropTypes.func.isRequired,
};