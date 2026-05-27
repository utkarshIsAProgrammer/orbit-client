import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormError from '../components/FormError';
import { UserPlus, Image, FileImage, ShieldCheck } from 'lucide-react';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'others'>('male');
  const [bio, setBio] = useState('');

  // File states
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>('');
  const [bannerPic, setBannerPic] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [isDragProfile, setIsDragProfile] = useState(false);
  const [isDragBanner, setIsDragBanner] = useState(false);

  // Error States
  const [usernameError, setUsernameError] = useState<string | undefined>(undefined);
  const [fullNameError, setFullNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [profilePicError, setProfilePicError] = useState<string | undefined>(undefined);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Validate inputs
  const validateParams = () => {
    setUsernameError(undefined);
    setFullNameError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
    setProfilePicError(undefined);

    if (username.length < 3 || username.length > 100) {
      setUsernameError('Username must be between 3 and 100 characters.');
      return false;
    }
    if (fullName.length < 3 || fullName.length > 50) {
      setFullNameError('Full Name must be between 3 and 50 characters.');
      return false;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return false;
    }
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setPasswordError('Password must contain uppercase, lowercase, numbers, and special symbols.');
      return false;
    }
    if (!profilePic) {
      setProfilePicError('Please select a profile picture.');
      return false;
    }
    return true;
  };

  const handleProfileFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProfilePicError('The selected file must be an image.');
      return;
    }
    setProfilePic(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProfilePicError('The selected file must be an image.');
      return;
    }
    setBannerPic(file);
    const reader = new FileReader();
    reader.onload = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateParams()) return;

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('username', username.trim());
      fd.append('fullName', fullName.trim());
      fd.append('email', email.trim());
      fd.append('password', password);
      fd.append('gender', gender);
      fd.append('bio', bio.trim());

      if (profilePic) {
        fd.append('profilePic', profilePic);
      }
      if (bannerPic) {
        fd.append('bannerImage', bannerPic);
      }

      await signup(fd);
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create account. Please try again.';
      setPasswordError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 md:px-6">
      <div className="bg-orbit-card border border-orbit-border rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 space-y-5 md:space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2 pb-4 border-b border-orbit-border">
          <div className="w-12 h-12 rounded-full border border-orbit-accent/40 flex items-center justify-center mx-auto">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-white mb-1">Join Orbit Today</h1>
          <p className="text-xs text-orbit-muted">
            Create your profile to connect, share, and discover amazing content.
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs text-left" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. wanderer"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
              />
              <FormError message={usernameError} />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
              />
              <FormError message={fullNameError} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. elena@example.com"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
              />
              <FormError message={emailError} />
            </div>

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs appearance-none cursor-pointer"
              >
                <option value="male" className="bg-[#151821]">
                  Male
                </option>
                <option value="female" className="bg-[#151821]">
                  Female
                </option>
                <option value="others" className="bg-[#151821]">
                  Other / Private
                </option>
              </select>
            </div>
          </div>

          {/* Password with inline helper */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
            />
            <FormError message={passwordError} />
            <div className="text-[11px] text-white/60 font-sans leading-relaxed bg-black/20 p-3 rounded-2xl border border-orbit-border flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orbit-accent shrink-0 mt-0.5" />
              <span>
                Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.
              </span>
            </div>
          </div>

          {/* Biography */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Bio Summary (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little bit about yourself..."
              rows={3}
              className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2 text-white transition-all text-xs resize-none"
            />
          </div>

          {/* Required Profile Picture selector with Drag & Drop */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Profile Photo <span className="text-rose-500 font-bold">*Required</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragProfile(true);
              }}
              onDragLeave={() => setIsDragProfile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragProfile(false);
                if (e.dataTransfer.files?.[0]) handleProfileFile(e.dataTransfer.files[0]);
              }}
              onClick={() => profileInputRef.current?.click()}
              className={`border border-dashed rounded-3xl p-4 text-center cursor-pointer transition-all ${
                isDragProfile ? 'border-white bg-white/5' : 'border-orbit-border hover:border-white/20 bg-black/20'
              }`}
            >
              <input
                type="file"
                ref={profileInputRef}
                onChange={(e) => e.target.files?.[0] && handleProfileFile(e.target.files[0])}
                className="hidden"
                accept="image/*"
              />

              {profilePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full border border-white p-0.5 mx-auto">
                    <img
                      src={profilePreview}
                      alt="profile preview"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono mt-1">{profilePic?.name}</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-white/40">
                  <FileImage className="w-7 h-7 text-white/30 mx-auto" />
                  <p className="font-semibold text-white">
                    Drag avatar here, or <span className="text-white hover:underline">browse folders</span>
                  </p>
                  <p className="text-[10px] text-orbit-muted">Supports PNG, JPEG or GIF</p>
                </div>
              )}
            </div>
            <FormError message={profilePicError} />
          </div>

          {/* Optional Profile Banner with Drag & Drop */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
              Profile Banner (Optional)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragBanner(true);
              }}
              onDragLeave={() => setIsDragBanner(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragBanner(false);
                if (e.dataTransfer.files?.[0]) handleBannerFile(e.dataTransfer.files[0]);
              }}
              onClick={() => bannerInputRef.current?.click()}
              className={`border border-dashed rounded-3xl p-4 text-center cursor-pointer transition-all h-24 flex items-center justify-center ${
                isDragBanner ? 'border-white bg-white/5' : 'border-orbit-border hover:border-white/20 bg-black/20'
              }`}
            >
              <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => e.target.files?.[0] && handleBannerFile(e.target.files[0])}
                className="hidden"
                accept="image/*"
              />

              {bannerPreview ? (
                <div className="w-full h-full relative rounded-2xl overflow-hidden flex items-center justify-center">
                  <img
                    src={bannerPreview}
                    alt="banner preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <span className="relative z-10 text-[9px] text-white font-mono bg-black/90 px-2.5 py-1 tracking-widest uppercase border border-white/10 rounded-full">
                    Banner Loaded
                  </span>
                </div>
              ) : (
                <div className="space-y-1 text-xs text-white/40">
                  <Image className="w-6 h-6 text-white/30 mx-auto" />
                  <p className="font-semibold">Drop banner image here</p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-orbit-accent text-orbit-accent-foreground font-semibold rounded-full text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 hover:opacity-95 cursor-pointer"
          >
            {submitting ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>

        {/* Footer lock */}
        <div className="pt-4 border-t border-orbit-border flex items-center justify-between text-xs font-semibold text-orbit-muted">
          <span>Already have an account?</span>
          <Link to="/login" className="text-orbit-accent hover:text-white transition-colors">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
