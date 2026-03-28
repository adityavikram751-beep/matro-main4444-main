'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Follow2FormProps = {
  otp: string;
  setOtp: (value: string) => void;
  onBack: () => void;
  phoneNumber: string;
  setIsProfileSetupOpen: (value: boolean) => void;
  closeModal: () => void;
  onSignupSuccess: (token: string, userId?: string) => void;
};

const Follow2Form = ({
  otp,
  setOtp,
  onBack,
  phoneNumber,
  setIsProfileSetupOpen,
  closeModal,
  onSignupSuccess,
}: Follow2FormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);

  // Show OTP from localStorage on mount (if any)
  useEffect(() => {
    const storedOtp = localStorage.getItem('registrationOtp');
    if (storedOtp && storedOtp.length === 4) {
      toast.success(`Test OTP: ${storedOtp}`, { duration: 10000 });
      // Optional: auto-fill OTP
      // setOtp(storedOtp);
    }
  }, []);

  const verifyOtp = async () => {
    if (otp.length !== 4) return;

    setIsLoading(true);
    setError('');

    try {
      // 🔥 Test shortcut mode
      if (otp === '1234') {
        toast.success('OTP verified successfully! (Test mode)');
        setPendingApproval(true);
        return;
      }

      const response = await fetch(
        'https://merimonial-backend.onrender.com/auth/verify-otp-register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber, otp }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('OTP verified successfully!');

        if (data.userId) {
          localStorage.setItem('pendingUserId', data.userId);
        }

        setPendingApproval(true);
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
        toast.error('Verification failed');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Failed to verify OTP. Please try again.');
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Call the same OTP request endpoint (used in Follow1Form)
      const response = await fetch(
        'https://merimonial-backend.onrender.com/auth/otp-request',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // If OTP is returned, show it in toast
        if (data.otp) {
          toast.success(`New OTP sent: ${data.otp}`);
          // Store new OTP for reference
          localStorage.setItem('registrationOtp', data.otp);
        } else {
          toast.success('OTP resent successfully');
        }
      } else {
        throw new Error(data.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP');
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const showStoredOtp = () => {
    const storedOtp = localStorage.getItem('registrationOtp');
    if (storedOtp) {
      toast.info(`Stored OTP: ${storedOtp}`, { duration: 5000 });
    } else {
      toast.info('No OTP stored');
    }
  };

  const maskedNumber =
    phoneNumber?.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') ?? 'your phone number';

  // If pending approval, show message and a close button
  if (pendingApproval) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Account Pending Approval</h3>
        <p className="text-sm text-gray-600 text-center">
          Your account has been created successfully. It is now pending approval from an administrator.
          You will be notified once your account is approved.
        </p>
        <Button
          onClick={closeModal}
          className="mt-4 bg-gray-600 hover:bg-gray-700 text-white"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <>
      <button onClick={onBack} className="mb-3">
        <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-rose-600 transition-colors" />
      </button>

      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        <h2 className="text-xl font-Lato text-gray-900">LOGO</h2>
        <p className="text-xl font-Lato text-gray-900">OTP VERIFICATION</p>
        <p className="text-sm font-Lato text-gray-700">
          We have sent the OTP to {maskedNumber}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-center">
          <InputOTP maxLength={4} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSeparator />
              <InputOTPSlot index={1} />
              <InputOTPSeparator />
              <InputOTPSlot index={2} />
              <InputOTPSeparator />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Didn't receive OTP?{' '}
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-rose-700 font-medium hover:underline"
            disabled={isLoading}
          >
            Resend
          </button>
        </p>
        <button
          type="button"
          onClick={showStoredOtp}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          title="Show stored OTP"
        >
          <Eye size={14} />
          Show OTP
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
      )}

      <Button
        onClick={verifyOtp}
        disabled={otp.length !== 4 || isLoading}
        className="w-full bg-[#7D0A0A] hover:bg-[#9e0e0e]"
        size="lg"
      >
        {isLoading ? 'Verifying...' : 'Verify'}
      </Button>
    </>
  );
};

Follow2Form.propTypes = {
  phoneNumber: PropTypes.string.isRequired,
  otp: PropTypes.string.isRequired,
  setOtp: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  setIsProfileSetupOpen: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  onSignupSuccess: PropTypes.func.isRequired,
};

export default Follow2Form;