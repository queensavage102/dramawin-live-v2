import React from 'react';
import { Flame, Gift, Home, User } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const BOTTOM_TABS: {
  id: AppTab;
  label: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'watch', label: 'Home', Icon: Home },
  { id: 'foryou', label: 'For You', Icon: Flame },
  { id: 'vault', label: 'Rewards', Icon: Gift },
  { id: 'me', label: 'Me', Icon: User },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Primary bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/92 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_28px_rgba(0,0,0,0.65)]"
    >
      <div className="max-w-5xl mx-auto h-16 px-2 grid grid-cols-4 items-center">
        {BOTTOM_TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer group"
            >
              <div
                className={`relative flex items-center justify-center w-9 h-7 rounded-full transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400/20 to-fuchsia-500/20 border border-amber-400/40'
                    : 'group-hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]'
                      : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none ${
                  isActive ? 'font-bold text-amber-300' : 'font-medium text-zinc-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
