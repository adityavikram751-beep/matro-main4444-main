'use client';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const profileOptions = [
  { id: 'myself', label: 'Myself' },
  { id: 'son', label: 'Son' },
  { id: 'daughter', label: 'Daughter' },
  { id: 'brother', label: 'Brother' },
  { id: 'sister', label: 'Sister' },
  { id: 'friend', label: 'Friend' },
  { id: 'relative', label: 'Relative' },
];

interface Step1FormProps {
  profileFor: string;
  setProfileFor: (value: string) => void;

  FirstName: string;
  setFirstName: (value: string) => void;

  MiddleName: string;
  setMiddleName: (value: string) => void;

  LastName: string;
  setLastName: (value: string) => void;

  dateOfBirth: string;
  setDateOfBirth: (value: string) => void;

  gender: string;
  setGender: (value: string) => void;

  maritalStatus: string;
  setMaritalStatus: (value: string) => void;

  numberOfChildren: number;
  setNumberOfChildren: (value: number) => void;

  isChildrenLivingWithYou: boolean;
  setIsChildrenLivingWithYou: (value: boolean) => void;

  handleContinue: () => void;
  onClose: () => void;
}

export default function Step1Form({
  profileFor,
  setProfileFor,
  FirstName,
  setFirstName,
  MiddleName,
  setMiddleName,
  LastName,
  setLastName,
  dateOfBirth,
  setDateOfBirth,
  gender,
  setGender,
  maritalStatus,
  setMaritalStatus,
  numberOfChildren,
  setNumberOfChildren,
  isChildrenLivingWithYou,
  setIsChildrenLivingWithYou,
  handleContinue,
  onClose
}: Step1FormProps) {
  
  const [age, setAge] = useState<number | null>(null);
  const [isUnder18, setIsUnder18] = useState(false);

  // Calculate age when dateOfBirth changes
  useEffect(() => {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      setAge(calculatedAge);
      setIsUnder18(calculatedAge < 18);
      
      // Show error toast if under 18
      if (calculatedAge < 18) {
        toast.error("You must be at least 18 years old to register.");
      }
    } else {
      setAge(null);
      setIsUnder18(false);
    }
  }, [dateOfBirth]);

  // Check if Unmarried - then hide children fields
  const isUnmarried = maritalStatus === "Unmarried";
  
  // Check if should show children fields (only for Divorced or Widowed)
  const showChildrenFields = maritalStatus === "Divorced" || maritalStatus === "Widowed";

  const handleContinueClick = () => {
    // Validate age
    if (age !== null && age < 18) {
      toast.error("You must be at least 18 years old to register.");
      return;
    }
    
    // Validate required fields
    if (!profileFor) {
      toast.error("Please select who this profile is for");
      return;
    }
    
    if (!FirstName.trim()) {
      toast.error("Please enter first name");
      return;
    }
    
    if (!LastName.trim()) {
      toast.error("Please enter last name");
      return;
    }
    
    if (!dateOfBirth) {
      toast.error("Please select date of birth");
      return;
    }
    
    if (!gender) {
      toast.error("Please select gender");
      return;
    }
    
    if (!maritalStatus) {
      toast.error("Please select marital status");
      return;
    }
    
    // For Divorced/Widowed, validate children fields
    if (showChildrenFields) {
      if (numberOfChildren < 0) {
        toast.error("Number of children cannot be negative");
        return;
      }
    }
    
    handleContinue();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-800">
        Please provide your basic details
      </h2>

      {/* Age Warning - if under 18 */}
      {isUnder18 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">
            ⚠️ You must be at least 18 years old to register.
            {age !== null && (
              <span className="block text-sm mt-1">
                Your current age is {age} years.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Profile selection */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          Profile For *
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {profileOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setProfileFor(opt.id)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                profileFor === opt.id
                  ? "bg-rose-700 text-white border-rose-700 shadow"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-rose-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Names */}
      <div>
        <Label className="font-medium">First Name *</Label>
        <Input
          value={FirstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter first name"
          className={isUnder18 ? "border-red-300" : ""}
        />
      </div>

      <div>
        <Label className="font-medium">Middle Name</Label>
        <Input
          value={MiddleName}
          onChange={(e) => setMiddleName(e.target.value)}
          placeholder="Enter middle name"
        />
      </div>

      <div>
        <Label className="font-medium">Last Name *</Label>
        <Input
          value={LastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter last name"
          className={isUnder18 ? "border-red-300" : ""}
        />
      </div>

      {/* DOB */}
      <div>
        <Label className="font-medium">Date of Birth *</Label>
        <div className="space-y-2">
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={isUnder18 ? "border-red-300" : ""}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18))
              .toISOString()
              .split('T')[0]}
          />
          {age !== null && (
            <p className={`text-sm ${isUnder18 ? 'text-red-600' : 'text-gray-600'}`}>
              Age: {age} years
            </p>
          )}
        </div>
      </div>

      {/* Gender */}
      <div>
        <Label className="font-medium">Gender *</Label>
        <RadioGroup 
          value={gender} 
          onValueChange={setGender} 
          className="flex gap-6 mt-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Male" id="male" disabled={isUnder18} />
            <Label htmlFor="male" className={isUnder18 ? "text-gray-400" : ""}>
              Male
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="Female" id="female" disabled={isUnder18} />
            <Label htmlFor="female" className={isUnder18 ? "text-gray-400" : ""}>
              Female
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Marital Status */}
      <div>
        <Label className="font-medium">Marital Status *</Label>
        <RadioGroup 
          value={maritalStatus} 
          onValueChange={setMaritalStatus} 
          className="flex gap-6 mt-2 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem 
              value="Unmarried" 
              id="unmarried" 
              disabled={isUnder18} 
            />
            <Label htmlFor="unmarried" className={isUnder18 ? "text-gray-400" : ""}>
              Unmarried
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem 
              value="Divorced" 
              id="divorced" 
              disabled={isUnder18} 
            />
            <Label htmlFor="divorced" className={isUnder18 ? "text-gray-400" : ""}>
              Divorced
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem 
              value="Widowed" 
              id="widowed" 
              disabled={isUnder18} 
            />
            <Label htmlFor="widowed" className={isUnder18 ? "text-gray-400" : ""}>
              Widowed
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Children fields - ONLY SHOW FOR DIVORCED/WIDOWED */}
      {showChildrenFields && !isUnmarried && (
        <>
          <div>
            <Label className="font-medium">Number of Children</Label>
            <Input
              type="number"
              min={0}
              value={numberOfChildren}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setNumberOfChildren(isNaN(value) ? 0 : value);
              }}
              disabled={isUnder18}
            />
          </div>

          <div>
            <Label className="font-medium">Children Living With You?</Label>
            <RadioGroup
              value={String(isChildrenLivingWithYou)}
              onValueChange={(v) => setIsChildrenLivingWithYou(v === "true")}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="true" id="with-yes" disabled={isUnder18} />
                <Label htmlFor="with-yes" className={isUnder18 ? "text-gray-400" : ""}>
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="false" id="with-no" disabled={isUnder18} />
                <Label htmlFor="with-no" className={isUnder18 ? "text-gray-400" : ""}>
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>
        </>
      )}

      {/* Continue Button */}
      <Button
        onClick={handleContinueClick}
        className={`w-full py-3 mt-4 ${
          isUnder18 
            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
            : "bg-rose-700 hover:bg-rose-800 text-white"
        }`}
        disabled={isUnder18}
      >
        {isUnder18 ? "Must be 18+ to continue" : "Continue"}
      </Button>
    </div>
  );
}