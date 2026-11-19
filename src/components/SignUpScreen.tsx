import React, { useState } from 'react';
import { Crown, ArrowRight, Sparkles } from 'lucide-react';
import { User } from 'firebase/auth';

interface SignUpScreenProps {
  firebaseUser: User | null;
  authError: string | null;
  submitting: boolean;
  onCreateProfile: (username: string, contact: string) => Promise<void>;
  onGoogleSignInOnly: () => Promise<void>;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  firebaseUser,
  authError,
  submitting,
  onCreateProfile,
  onGoogleSignInOnly,
}) => {
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState(firebaseUser?.email || '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmedName = username.trim();
    const trimmedContact = contact.trim();

    if (trimmedName.length < 2 || trimmedName.length > 32) {
      setLocalError('Please choose a username between 2 and 32 characters.');
      return;
    }
    if (trimmedContact.length < 4) {
      setLocalError('Please enter your Email or WhatsApp number.');
      return;
    }

    try {
      await onCreateProfile(trimmedName, trimmedContact);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to create profile.');
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#070709] text-[#F6F2E9] flex flex-col lg:grid lg:grid-cols-12">
      {/* Left / Top Cinema Visual Showcase */}
      <div className="relative lg:col-span-6 min-h-[240px] lg:min-h-screen overflow-hidden border-b lg:border-b-0 lg:border-r border-[#D4AF37]/15">
        {!imgFailed ? (
          <img
            src="/src/assets/images/drama_velvet_crown_1794573505264.jpg"
            alt="DramaWin Coins Luxury Premiere"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-75"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1B1508] via-[#0C0C10] to-[#070709]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/65 to-[#070709]/35" />

        <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-12">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg flex items-center justify-center text-[#181307] shadow-lg shadow-[#D4AF37]/20">
              <Crown className="w-5 h-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-[#F6F2E9]">
              DramaWin Coins
            </span>
          </div>

          <div className="max-w-lg pt-10 lg:pt-0 space-y-3">
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#E8C96D]">
              Members-Only Rewards Club
            </p>
            <h1 className="text-3xl lg:text-5xl font-display font-bold leading-tight text-[#F6F2E9]">
              Your nightly drama ritual, rewarded in gold.
            </h1>
            <p className="text-sm lg:text-base text-[#C4BDB0] leading-relaxed">
              Check in daily, unlock featured short-drama episodes, and climb the Top 1,000 leaderboard for the R50 Sunday Airtime Pool.
            </p>
          </div>
        </div>
      </div>

      {/* Right / Main Player Profile Sign-Up Form */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#F6F2E9]">
              Create Player Profile
            </h2>
            <p className="text-sm text-[#A69F91]">
              Set up your player handle and payout contact before entering DramaWin Coins.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="obsidian-card rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-username"
                className="block text-xs font-semibold tracking-wide text-[#E8C96D]"
              >
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                required
                minLength={2}
                maxLength={32}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Kagiso_Gold"
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm text-[#F6F2E9] placeholder-[#6B655B] focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-contact"
                className="block text-xs font-semibold tracking-wide text-[#E8C96D]"
              >
                Email or WhatsApp number
              </label>
              <input
                id="signup-contact"
                type="text"
                required
                minLength={4}
                maxLength={120}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="name@email.com or +27 82 000 0000"
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm text-[#F6F2E9] placeholder-[#6B655B] focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <p className="text-xs text-[#8D867A]">
                Used strictly for Sunday Airtime Pool winner delivery.
              </p>
            </div>

            {displayError && (
              <div
                role="alert"
                className="rounded-xl bg-red-950/50 border border-red-500/30 px-4 py-3 text-xs text-red-200"
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/15 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <span>
                {submitting
                  ? 'Entering Studio...'
                  : firebaseUser
                    ? 'Create Profile & Enter'
                    : 'Continue with Google & Enter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!firebaseUser && (
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs text-[#8D867A]">Already have a profile?</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void onGoogleSignInOnly()}
                  className="min-h-[40px] px-3 text-xs font-semibold text-[#E8C96D] hover:text-[#FCE7A2] transition-colors whitespace-nowrap shrink-0"
                >
                  Sign in with Google
                </button>
              </div>
            )}
          </form>

          <div className="flex items-center justify-between text-xs text-[#8D867A] px-1">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              R50 Weekly Sunday Pool
            </span>
            <span>1st R25 · 2nd R15 · 3rd R10</span>
          </div>
        </div>
      </div>
    </div>
  );
};
