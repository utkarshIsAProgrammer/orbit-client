import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormError from '../components/FormError';
import { LogIn } from 'lucide-react';
import {
  AmbientMesh,
  StaggerContainer,
  StaggerItem,
  SlideIn,
  Magnetic,
  GlowPulse,
} from '../components/MotionPrimitives';
import { motion } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

  // Determine redirect url (referring page before interception)
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(undefined);
    setPasswordError(undefined);

    if (!email) {
      setEmailError('Please enter your email address.');
      return;
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to sign in. Please try again.';
      setPasswordError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen-dynamic flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <AmbientMesh />
      <GlowPulse className="w-full max-w-sm bg-orbit-card/80 backdrop-blur-xl border border-orbit-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 space-y-5 md:space-y-6 shadow-2xl relative z-10">
        {/* Brand visual header */}
        <SlideIn direction="down" duration={0.6}>
          <div className="text-center space-y-2">
            <motion.div
              className="w-12 h-12 rounded-full border border-orbit-accent/40 flex items-center justify-center mx-auto"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LogIn className="w-4 h-4 text-white" />
            </motion.div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-white mb-1">Welcome Back</h2>
            <p className="text-xs text-orbit-muted">Sign in to continue your journey on Orbit.</p>
          </div>
        </SlideIn>

        {/* Input Form */}
        <StaggerContainer className="space-y-4 text-xs">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <StaggerItem>
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-xs"
              />
              <FormError message={emailError} />
            </StaggerItem>

            <StaggerItem className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] uppercase font-bold text-orbit-accent hover:text-white transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-3 text-white transition-all text-xs"
              />
              <FormError message={passwordError} />
            </StaggerItem>

            <StaggerItem>
              <Magnetic strength={0.15}>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-orbit-accent text-orbit-accent-foreground font-semibold rounded-full text-xs transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </motion.button>
              </Magnetic>
            </StaggerItem>
          </form>

          {/* Info panel */}
          <StaggerItem className="pt-4 border-t border-orbit-border flex items-center justify-between text-xs font-semibold text-orbit-muted">
            <span>New to Orbit?</span>
            <Link to="/signup" className="text-orbit-accent hover:text-white transition-colors font-bold">
              Create Account
            </Link>
          </StaggerItem>
        </StaggerContainer>
      </GlowPulse>
    </div>
  );
}
