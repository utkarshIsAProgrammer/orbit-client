import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, deleteAccount } from '../api/users';
import { updatePasswordLoggedIn } from '../api/password';
import { toast } from 'sonner';
import { Settings as SettingsIcon, ShieldAlert, KeyRound, UserCog, Trash2, RotateCw } from 'lucide-react';
import Modal from '../components/Modal';
import FormError from '../components/FormError';

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Profile fields state
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [fullNameInput, setFullNameInput] = useState(user?.fullName || '');
  const [genderInput, setGenderInput] = useState(user?.gender || 'male');
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [bannerPicFile, setBannerPicFile] = useState<File | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string>();

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();

  // Delete account fields state
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmDeletePassword, setConfirmDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string>();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Update Profile Form Submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(undefined);

    if (usernameInput.length < 3 || usernameInput.length > 100) {
      setProfileError('Username must be between 3 and 100 characters.');
      return;
    }
    if (fullNameInput.length < 3 || fullNameInput.length > 50) {
      setProfileError('Full name must be between 3 and 50 characters.');
      return;
    }

    try {
      setProfileLoading(true);
      const fd = new FormData();
      fd.append('username', usernameInput.trim());
      fd.append('fullName', fullNameInput.trim());
      fd.append('gender', genderInput);
      fd.append('bio', bioInput.trim());

      if (profilePicFile) {
        fd.append('profilePic', profilePicFile);
      }
      if (bannerPicFile) {
        fd.append('bannerImage', bannerPicFile);
      }

      const res = await updateProfile(fd);
      if (res.success) {
        toast.success('Profile updated successfully.');
        await refreshUser(); // sync local session
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Update Password Form Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(undefined);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all security fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Confirm password does not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await updatePasswordLoggedIn({
        email: user?.email,
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success('Password updated! Please sign in again.');
        await logout().catch(() => undefined);
        navigate('/login');
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Permanent Delete account Submit
  const handleDeleteSubmit = async () => {
    setDeleteError(undefined);
    if (confirmEmail.trim() !== user?.email) {
      setDeleteError('The email address does not match your current account.');
      return;
    }
    if (!confirmDeletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await deleteAccount({
        email: confirmEmail.trim(),
        password: confirmDeletePassword,
      });

      if (res.success) {
        toast.success('Account permanently deleted.');
        await logout().catch(() => undefined);
        navigate('/signup');
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Verification code failed.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
      {/* Custom Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Permanently Delete Account"
        description="Once verified, your account, including all posts, saves, likes, follow connections, comments, and private messages will be permanently scrubbed from our systems. This action cannot be undone."
        variant="danger"
        confirmText="Permanently Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteSubmit}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-rose-300 hover:text-white uppercase block">
              Confirm Email
            </label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user?.email}
              className="w-full bg-black/40 border border-rose-950/40 focus:border-rose-500 focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
            />
            <FormError message={deleteError} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-rose-300 hover:text-white uppercase block">
              Current Password
            </label>
            <input
              type="password"
              value={confirmDeletePassword}
              onChange={(e) => setConfirmDeletePassword(e.target.value)}
              placeholder="Enter your security password"
              className="w-full bg-black/40 border border-rose-950/40 focus:border-rose-500 focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Settings Navigation sidebar */}
      <aside className="md:col-span-4 space-y-4">
        <div className="bg-orbit-card border border-orbit-border rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-display font-semibold border-b border-orbit-border pb-3 text-sm">
            <SettingsIcon className="w-5 h-5 text-orbit-accent" />
            <span>Settings Hub</span>
          </div>

          <ul className="space-y-3 font-mono text-orbit-muted text-left">
            <li className="flex justify-between items-center bg-black/20 p-2.5 rounded-2xl border border-orbit-border">
              <span>USERNAME</span>
              <span className="text-white font-semibold">@{user?.username}</span>
            </li>
            <li className="flex justify-between items-center bg-black/20 p-2.5 rounded-2xl border border-orbit-border">
              <span>MEMBER SINCE</span>
              <span className="text-white font-semibold">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '---'}
              </span>
            </li>
            <li className="flex justify-between items-center bg-black/20 p-2.5 rounded-2xl border border-orbit-border">
              <span>STATUS</span>
              <span className="text-emerald-400 font-semibold">ACTIVE</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Settings Panel */}
      <main className="md:col-span-8 space-y-6">
        {/* Panel 1: Update Bio Credentials */}
        <section className="bg-orbit-card border border-orbit-border rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 text-white font-display border-b border-orbit-border pb-3 text-sm">
            <UserCog className="w-4.5 h-4.5 text-orbit-accent" />
            <span>Edit Profile Details</span>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-left" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Username
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.replace(/\s+/g, ''))}
                  className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Gender</label>
                <select
                  value={genderInput}
                  onChange={(e) => setGenderInput(e.target.value as any)}
                  className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs appearance-none cursor-pointer"
                >
                  <option value="male" className="bg-[#151821]">
                    Male
                  </option>
                  <option value="female" className="bg-[#151821]">
                    Female
                  </option>
                  <option value="others" className="bg-[#151821]">
                    Others
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  title="Your registered email address cannot be edited."
                  className="w-full bg-black/40 border border-orbit-border opacity-50 cursor-not-allowed rounded-2xl px-4 py-2.5 text-zinc-500 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">Biography</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Write something about yourself..."
                rows={4}
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Profile Photo
                </label>
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && setProfilePicFile(e.target.files[0])}
                  accept="image/*"
                  className="w-full text-zinc-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white file:cursor-pointer hover:file:opacity-90 bg-black/40 border border-orbit-border rounded-2xl p-1 font-mono cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Profile Banner
                </label>
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && setBannerPicFile(e.target.files[0])}
                  accept="image/*"
                  className="w-full text-zinc-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white file:cursor-pointer hover:file:opacity-90 bg-black/40 border border-orbit-border rounded-2xl p-1 font-mono cursor-pointer"
                />
              </div>
            </div>

            <FormError message={profileError} />

            <button
              type="submit"
              disabled={profileLoading}
              className="bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground font-semibold rounded-full px-5 py-2.5 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0 whitespace-nowrap"
            >
              {profileLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : null}
              <span>Save Changes</span>
            </button>
          </form>
        </section>

        {/* Panel 2: Password Recalibration */}
        <section className="bg-orbit-card border border-orbit-border rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 text-white font-display border-b border-orbit-border pb-3 text-sm">
            <KeyRound className="w-4.5 h-4.5 text-orbit-accent" />
            <span>Change Password</span>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left" noValidate>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Current Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-orbit-accent hover:text-white transition-colors font-bold"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-orbit-muted uppercase tracking-wider block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-black/40 border border-orbit-border focus:border-orbit-accent focus:outline-none rounded-2xl px-4 py-2.5 text-white transition-all text-xs"
                />
              </div>
            </div>

            <FormError message={passwordError} />

            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-orbit-accent hover:opacity-95 text-orbit-accent-foreground font-semibold rounded-full px-5 py-2.5 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0 whitespace-nowrap"
            >
              {passwordLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" /> : null}
              <span>Update Password</span>
            </button>
          </form>
        </section>

        {/* Panel 3: Permanent Self-Destruct */}
        <section className="bg-orbit-card border border-rose-950/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 text-rose-400 font-display border-b border-rose-950/40 pb-3 text-sm">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
            <span>Danger Zone (Delete Account)</span>
          </div>

          <div className="bg-rose-950/10 border border-rose-900/40 p-4 rounded-2xl text-rose-300 space-y-1 leading-relaxed text-left">
            <p className="font-semibold uppercase tracking-wider">Permanent Account Deletion</p>
            <p className="text-[11px] leading-relaxed">
              Once verified, your account, including all posts, saves, likes, follow connections, comments, and private
              messages will be permanently scrubbed from our systems. This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-rose-950/30 text-rose-300 hover:bg-rose-950/70 border border-rose-900/40 font-semibold rounded-full px-5 py-2.5 transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Permanently Delete Account</span>
          </button>
        </section>
      </main>
    </div>
  );
}
