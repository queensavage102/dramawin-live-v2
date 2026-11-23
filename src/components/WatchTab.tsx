import React from 'react';
import { DramaEpisode, DramaSeries, PlayerPrivate } from '../types';
import { SeriesFoldersSection } from './SeriesFoldersSection';

interface WatchTabProps {
  sections: string[];
  episodes: DramaEpisode[];
  cloudSeries?: DramaSeries[];
  privateState: PlayerPrivate;
  isAdmin?: boolean;
  referralUserId?: string;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onClaimGiftBoxCoins?: () => Promise<void>;
  onShareEpisode?: (episode: DramaEpisode) => void;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: { claimLabel?: string; readyHeadline?: string }
  ) => void;
  onClaimHeroBonus?: () => Promise<void>;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
}

export const WatchTab: React.FC<WatchTabProps> = ({
  sections,
  episodes,
  cloudSeries,
  privateState,
  isAdmin = false,
  referralUserId,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal,
  onToggleMute,
  onAwardCoinPot,
  onClaimGiftBoxCoins,
  onShareEpisode,
  onStartSponsorReward,
  onClaimHeroBonus,
  onMarkEpisodeWatched,
}) => {
  return (
    <SeriesFoldersSection
      sections={sections}
      episodes={episodes}
      cloudSeries={cloudSeries}
      privateState={privateState}
      isAdmin={isAdmin}
      referralUserId={referralUserId}
      sponsorAdUrl={sponsorAdUrl}
      playerWeeklyCoins={playerWeeklyCoins}
      playerTotalCoins={playerTotalCoins}
      qualificationThreshold={qualificationThreshold}
      muted={muted}
      resumePlaybackSignal={resumePlaybackSignal}
      onToggleMute={onToggleMute}
      onAwardCoinPot={onAwardCoinPot}
      onClaimGiftBoxCoins={onClaimGiftBoxCoins}
      onShareEpisode={onShareEpisode}
      onStartSponsorReward={onStartSponsorReward}
      onClaimHeroBonus={onClaimHeroBonus}
      onMarkEpisodeWatched={onMarkEpisodeWatched}
    />
  );
};
