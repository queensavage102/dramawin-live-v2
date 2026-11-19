import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DEFAULT_LIVE_TICKER_NAMES } from '../constants';

interface LiveWinnerTickerProps {
  enabled: boolean;
  names: string[];
  poolPrizeZar: number;
}

export const LiveWinnerTicker: React.FC<LiveWinnerTickerProps> = ({
  enabled,
  names,
  poolPrizeZar,
}) => {
  const alerts = useMemo(() => {
    const cleanNames = (names && names.length > 0 ? names : DEFAULT_LIVE_TICKER_NAMES)
      .map((n) => n.trim())
      .filter(Boolean);

    if (cleanNames.length === 0) return [];

    return cleanNames.map((name, index) => {
      const pattern = index % 4;
      if (pattern === 0) {
        return `🎉 ${name} just unlocked an R3 Progress Bar Boost in the 11-Ad Mystery Vault!`;
      }
      if (pattern === 1) {
        return `🏆 ${name} qualified for the R${poolPrizeZar} Sunday Pool!`;
      }
      if (pattern === 2) {
        return `🎁 ${name} unlocked +150 Coins watching Featured Drama Playlist!`;
      }
      return `🎉 ${name} completed the 11-Ad R3 Boost cycle!`;
    });
  }, [names, poolPrizeZar]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!enabled || alerts.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % alerts.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [enabled, alerts.length]);

  useEffect(() => {
    if (activeIndex >= alerts.length) {
      setActiveIndex(0);
    }
  }, [alerts.length, activeIndex]);

  if (!enabled || alerts.length === 0) {
    return null;
  }

  const currentAlert = alerts[activeIndex] || alerts[0];

  return (
    <div className="flex justify-center">
      <div
        role="status"
        aria-live="polite"
        className="w-full sm:w-auto sm:min-w-[340px] max-w-xl rounded-full bg-gradient-to-r from-[#120F08]/95 via-[#1A150B]/95 to-[#120F08]/95 border border-[#D4AF37]/35 shadow-lg shadow-[#D4AF37]/10 px-4 py-2 overflow-hidden"
      >
        <div className="h-5 flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${activeIndex}-${currentAlert}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs sm:text-[13px] font-medium text-[#FCE7A2] text-center truncate w-full"
            >
              {currentAlert}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
