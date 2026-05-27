import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordOtp, verifyAndResetPassword } from '../api/password';
import { toast } from 'sonner';
import { KeyRound, ShieldAlert } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestPasswordOtp(email);
      if (res.success) {
        toast.success(res.message || 'OTP sent successfully! (Demo OTP is 653021)');
        setStep(2);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyAndResetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success(res.message || 'Password reset successfully! Please sign in.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-dynamic flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md bg-orbit-card border border-orbit-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 space-y-5 md:space-y-6 shadow-2xl relative">
        {/* Step Indicator Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full border border-orbit-accent/40 flex items-center justify-center mx-auto">
            <KeyRound className="w-5 h-5 text-orbit-accent animate-pulse" />
          </div>
          <h2 className="font-display font-semibold text-2xl text-white tracking-tight">Reset Password</h2>
          <p className="text-xs text-orbit-muted">
            {step === 1 ? 'Step 1: Enter your registered email.' : 'Step 2: Enter the OTP and your new password.'}
          </p>
        </div>

        {/* STEP 1: REQUEST OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-sm" noValidate>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground font-semibold rounded-full transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Please wait...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY AND RESET */}
        {step === 2 && (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-sm" noValidate>
            <div className="bg-black/40 border border-orbit-border p-3 rounded-2xl flex gap-1.5 text-[11px] font-mono text-cyan-400">
              <ShieldAlert className="w-4 h-4 text-orbit-accent shrink-0 mt-0.5" />
              <span>
                The demo OTP code is <code className="bg-white/10 text-white font-bold px-1 rounded">653021</code>
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">OTP Code</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit Reset Code"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm font-mono tracking-widest text-center"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-sm"
              />
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-orbit-muted hover:text-white rounded-full text-[10px] sm:text-xs font-semibold transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3 bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground font-semibold rounded-full text-[10px] sm:text-xs transition-all disabled:opacity-50 cursor-pointer animate-scale-up"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-orbit-border text-center text-xs text-orbit-muted">
          <Link to="/login" className="text-orbit-accent hover:text-indigo-300 transition-colors font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
