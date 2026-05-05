'use client';

import { useState, useEffect } from 'react';
import Step1Form from './Step1';
import Step2Form from './Step2';
import Step3Form from './Step3';
import Step4Form from './Step4';
import Step5Form from './Step5';
import Step6Form from './Step6';
import Step7Form from './Step7';

interface MultiStepFormProps {
  onClose: () => void;
  onSuccess?: (profileData: any) => void;
}

export default function MultiStepForm({ onClose, onSuccess }: MultiStepFormProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- STATE ---------------- */
  const [profileFor, setProfileFor] = useState('');
  const [FirstName, setFirstName] = useState('');
  const [MiddleName, setMiddleName] = useState('');
  const [LastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState(0);
  const [isChildrenLivingWithYou, setIsChildrenLivingWithYou] = useState(false);

  const [religion, setReligion] = useState('');
  const [willingToMarryOtherCaste, setWillingToMarryOtherCaste] = useState<boolean | null>(null);
  const [caste, setCaste] = useState('');
  const [community, setCommunity] = useState('');
  const [gotra, setGotra] = useState('');
  const [motherTongue, setMotherTongue] = useState('');

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [complexion, setComplexion] = useState('');
  const [anyDisability, setAnyDisability] = useState(false);
  const [diet, setDiet] = useState('');

  const [familyType, setFamilyType] = useState('');
  const [familyStatus, setFamilyStatus] = useState('');

  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [highestEducation, setHighestEducation] = useState('');

  const [employedIn, setEmployedIn] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [designation, setDesignation] = useState('');

  const [profileImage, setProfileImage] = useState<File | string | null>(null);

  /* ---------------- HELPER: safely extract value ---------------- */
  const getValue = (obj: any, ...keys: string[]) => {
    for (let key of keys) {
      if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
    }
    return '';
  };

  /* ---------------- FETCH EXISTING PROFILE ---------------- */
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching profile...');
        const res = await fetch(
          'https://merimonial-backend.onrender.com/api/profile/login-profile-details',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          if (res.status === 404) {
            console.log('📭 No profile exists yet');
            setLoading(false);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log('✅ Full API response:', data); // <-- YAHAN DEKH

        // Agar data nested hai like { profile: { ... } } toh yahan handle karo
        const profileData = data.profile || data.data || data;

        // ---- FIELD MAPPING (customise according to console output) ----
        setProfileFor(getValue(profileData, 'profileFor', 'profile_for', 'profileFor'));
        setFirstName(getValue(profileData, 'FirstName', 'firstName', 'first_name', 'fname'));
        setMiddleName(getValue(profileData, 'MiddleName', 'middleName', 'middle_name', 'mname'));
        setLastName(getValue(profileData, 'LastName', 'lastName', 'last_name', 'lname'));
        setDateOfBirth(getValue(profileData, 'dateOfBirth', 'dob', 'birthDate', 'birth_date'));
        setGender(getValue(profileData, 'gender'));
        setMaritalStatus(getValue(profileData, 'maritalStatus', 'marital_status'));
        setNumberOfChildren(profileData.numberOfChildren ?? profileData.children_count ?? 0);
        setIsChildrenLivingWithYou(profileData.isChildrenLivingWithYou ?? profileData.children_living_with_you ?? false);
        
        setReligion(getValue(profileData, 'religion'));
        setWillingToMarryOtherCaste(profileData.willingToMarryOtherCaste ?? profileData.willing_to_marry_other_caste ?? null);
        setCaste(getValue(profileData, 'caste'));
        setCommunity(getValue(profileData, 'community'));
        setGotra(getValue(profileData, 'gotra'));
        setMotherTongue(getValue(profileData, 'motherTongue', 'mother_tongue'));

        setHeight(getValue(profileData, 'height'));
        setWeight(getValue(profileData, 'weight'));
        setComplexion(getValue(profileData, 'complexion'));
        setAnyDisability(profileData.anyDisability ?? profileData.any_disability ?? false);
        setDiet(getValue(profileData, 'diet'));

        setFamilyType(getValue(profileData, 'familyType', 'family_type'));
        setFamilyStatus(getValue(profileData, 'familyStatus', 'family_status'));

        setCountry(getValue(profileData, 'country'));
        setState(getValue(profileData, 'state'));
        setCity(getValue(profileData, 'city'));
        setHighestEducation(getValue(profileData, 'highestEducation', 'education', 'highest_education'));

        setEmployedIn(getValue(profileData, 'employedIn', 'employed_in'));
        setAnnualIncome(getValue(profileData, 'annualIncome', 'annual_income', 'income'));
        setWorkLocation(getValue(profileData, 'workLocation', 'work_location', 'location'));
        setDesignation(getValue(profileData, 'designation'));

        if (profileData.profileImage || profileData.profile_image) {
          setProfileImage(profileData.profileImage || profileData.profile_image);
        }

        // Agar kuch bhi set hua hai to console mein dekh
        console.log('📝 Set FirstName:', FirstName); // ye updated value nahi dikhega, useEffect ke andar hai
        // Better: log after state update using setTimeout
        setTimeout(() => {
          console.log('State after update:', { FirstName, LastName, gender });
        }, 100);

      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ---------------- EXTRA DEBUG: log state on change ---------------- */
  useEffect(() => {
    if (!loading) {
      console.log('Current form state:', {
        FirstName, LastName, gender, dateOfBirth, religion, caste
      });
    }
  }, [loading, FirstName, LastName, gender, dateOfBirth, religion, caste]);

  /* ---------------- NAVIGATION ---------------- */
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onClose();
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    if (submitting) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Login required');
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('profileFor', profileFor);
    formData.append('FirstName', FirstName);
    formData.append('MiddleName', MiddleName);
    formData.append('LastName', LastName);
    formData.append('dateOfBirth', dateOfBirth);
    formData.append('gender', gender);
    formData.append('maritalStatus', maritalStatus);
    formData.append('numberOfChildren', numberOfChildren.toString());
    formData.append('isChildrenLivingWithYou', String(isChildrenLivingWithYou));
    formData.append('religion', religion);
    formData.append('willingToMarryOtherCaste', String(willingToMarryOtherCaste));
    formData.append('caste', caste);
    formData.append('community', community);
    formData.append('gotra', gotra);
    formData.append('motherTongue', motherTongue);
    formData.append('height', height);
    formData.append('weight', weight);
    formData.append('complexion', complexion);
    formData.append('anyDisability', String(anyDisability));
    formData.append('diet', diet);
    formData.append('familyType', familyType);
    formData.append('familyStatus', familyStatus);
    formData.append('country', country);
    formData.append('state', state);
    formData.append('city', city);
    formData.append('highestEducation', highestEducation);
    formData.append('employedIn', employedIn);
    formData.append('annualIncome', annualIncome);
    formData.append('workLocation', workLocation);
    formData.append('designation', designation);
    if (profileImage instanceof File) formData.append('profileImage', profileImage);

    try {
      const res = await fetch('https://merimonial-backend.onrender.com/auth/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');

      alert('Profile submitted successfully');
      onSuccess?.(data);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- LOADING / ERROR UI ---------------- */
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <p className="text-red-600">Error: {error}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Close</button>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl mx-4 rounded-xl shadow-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Create Profile</h2>
            <p className="text-sm text-gray-500">Step {step} of 7</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleBack} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Back</button>
            <button onClick={onClose} className="px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-sm text-red-600">Close</button>
          </div>
        </div>
        <div className="p-4 space-y-6">
          {step === 1 && (
            <Step1Form
              profileFor={profileFor} setProfileFor={setProfileFor}
              FirstName={FirstName} setFirstName={setFirstName}
              MiddleName={MiddleName} setMiddleName={setMiddleName}
              LastName={LastName} setLastName={setLastName}
              dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
              gender={gender} setGender={setGender}
              maritalStatus={maritalStatus} setMaritalStatus={setMaritalStatus}
              numberOfChildren={numberOfChildren} setNumberOfChildren={setNumberOfChildren}
              isChildrenLivingWithYou={isChildrenLivingWithYou} setIsChildrenLivingWithYou={setIsChildrenLivingWithYou}
              handleContinue={() => setStep(2)} onClose={onClose}
            />
          )}
          {step === 2 && (
            <Step2Form
              religion={religion} setReligion={setReligion}
              willingToMarryOtherCaste={willingToMarryOtherCaste} setWillingToMarryOtherCaste={setWillingToMarryOtherCaste}
              caste={caste} setCaste={setCaste}
              community={community} setCommunity={setCommunity}
              gotra={gotra} setGotra={setGotra}
              motherTongue={motherTongue} setMotherTongue={setMotherTongue}
              handleContinue={() => setStep(3)} onBack={handleBack} onClose={onClose}
            />
          )}
          {step === 3 && (
            <Step3Form
              height={height} setHeight={setHeight}
              weight={weight} setWeight={setWeight}
              complexion={complexion} setComplexion={setComplexion}
              anyDisability={anyDisability} setAnyDisability={setAnyDisability}
              diet={diet} setDiet={setDiet}
              handleContinue={() => setStep(4)} onBack={handleBack} onClose={onClose}
            />
          )}
          {step === 4 && (
            <Step4Form
              familyType={familyType} setFamilyType={setFamilyType}
              familyStatus={familyStatus} setFamilyStatus={setFamilyStatus}
              handleContinue={() => setStep(5)} onBack={handleBack} onClose={onClose}
            />
          )}
          {step === 5 && (
            <Step5Form
              country={country} setCountry={setCountry}
              state={state} setState={setState}
              city={city} setCity={setCity}
              highestEducation={highestEducation} setHighestEducation={setHighestEducation}
              handleContinue={() => setStep(6)} onBack={handleBack} onClose={onClose}
            />
          )}
          {step === 6 && (
            <Step6Form
              employedIn={employedIn} setEmployedIn={setEmployedIn}
              annualIncome={annualIncome} setAnnualIncome={setAnnualIncome}
              workLocation={workLocation} setWorkLocation={setWorkLocation}
              designation={designation} setDesignation={setDesignation}
              handleContinue={() => setStep(7)} onBack={handleBack} onClose={onClose}
            />
          )}
          {step === 7 && (
            <Step7Form
              profileImage={profileImage} setProfileImage={setProfileImage}
              handleContinue={handleSubmit} onBack={handleBack} onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}