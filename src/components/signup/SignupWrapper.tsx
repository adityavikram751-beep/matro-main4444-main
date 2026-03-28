'use client';

import { useState } from 'react';
import Follow1Form from './follow1';
import Follow2Form from './follow2';

interface SignupWrapperProps {
  onSignupSuccess: (token: string, userData?: any) => void;
  setIsProfileSetupOpen: (value: boolean) => void;
  closeModal: () => void;
}

const SignupWrapper = ({
  onSignupSuccess,
  setIsProfileSetupOpen,
  closeModal,
}: SignupWrapperProps) => {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState(''); 
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  // No adhaar state needed

  // Step 2 fields
  const [otp, setOtp] = useState('');

  const handleContinueFollow2 = () => {
    if (!firstName || !lastName || !mobileNumber) {
      alert('Please fill all required fields');
      return;
    }
    setStep(2);
  };

  const handleBackToFollow1 = () => {
    setStep(1);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {step === 1 && (
        <Follow1Form
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          gender={gender}
          setGender={setGender}
          age={age}
          setAge={setAge}
          email={email}
          setEmail={setEmail}
          mobileNumber={mobileNumber}
          setMobileNumber={setMobileNumber}
          onBack={handleBackToFollow1}
          handleContinueFollow2={handleContinueFollow2}
        />
      )}

      {step === 2 && (
        <Follow2Form
          otp={otp}
          phoneNumber={mobileNumber}
          setOtp={setOtp}
          onBack={handleBackToFollow1}
          closeModal={closeModal}
          setIsProfileSetupOpen={setIsProfileSetupOpen}
          onSignupSuccess={(token, userId) => {
            onSignupSuccess(token, userId);
          }}
        />
      )}
    </div>
  );
};

export default SignupWrapper;