import React from 'react';
import { DramaEpisode, DramaSeries, PlayerPrivate, WatchPartyRoom } from '../types';
import { SeriesFoldersSection } from './SeriesFoldersSection';

interface WatchTabProps {
  sections: string[];
  episodes: DramaEpisode[];
  cloudSeries?: DramaSeries[];
  privateState: PlayerPrivate;
  unlockedMovieIds?: string[];
  isAdmin?: boolean;
  referralUserId?: string;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  watchPartyRoom?: WatchPartyRoom | null;
  watchPartyRole?: 'host' | 'guest';
  watchPartyViewerCount?: number;
  watchPartyUsername?: string;
  onOpenWatchPartyLobby?: (currentEpisode?: DramaEpisode | null) => void;
  onLeaveWatchParty?: () => void;
  onSyncHostPlayback?: (playback: { isPlaying: boolean; currentTime: number }) => void;
  onSwitchWatchPartyEpisode?: (episode: DramaEpisode) => Promise<void>;
  onDeductSuperReactionCoins?: (cost: number, title: string) => Promise<boolean>;
  onWatchBonusAd?: () => void;
  onNotifyWatchParty?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
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
  onUnlockArchiveMovie?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onUnlockArchiveMovieWithAd?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onRecordWatchSeconds?: (deltaSeconds: number) => void;
  onRecordEpisodeCompleted?: (episodeId: string) => void;
  onPlayerOpenChange?: (isOpen: boolean) => void;
  closePlayerSignal?: number;
  onGoToBoost?: () => void;
}

export const WatchTab: React.FC<WatchTabProps> = ({
  sections,
  episodes,
  cloudSeries,
  privateState,
  unlockedMovieIds = [],
  isAdmin = false,
  referralUserId,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal,
  watchPartyRoom,
  watchPartyRole,
  watchPartyViewerCount,
  watchPartyUsername,
  onOpenWatchPartyLobby,
  onLeaveWatchParty,
  onSyncHostPlayback,
  onSwitchWatchPartyEpisode,
  onDeductSuperReactionCoins,
  onWatchBonusAd,
  onNotifyWatchParty,
  onToggleMute,
  onAwardCoinPot,
  onClaimGiftBoxCoins,
  onShareEpisode,
  onStartSponsorReward,
  onClaimHeroBonus,
  onMarkEpisodeWatched,
  onUnlockArchiveMovie,
  onUnlockArchiveMovieWithAd,
  onRecordWatchSeconds,
  onRecordEpisodeCompleted,
  onPlayerOpenChange,
  closePlayerSignal,
  onGoToBoost,
}) => {
  return (
    <SeriesFoldersSection
      sections={sections}
      episodes={episodes}
      cloudSeries={cloudSeries}
      privateState={privateState}
      unlockedMovieIds={unlockedMovieIds}
      isAdmin={isAdmin}
      referralUserId={referralUserId}
      sponsorAdUrl={sponsorAdUrl}
      playerWeeklyCoins={playerWeeklyCoins}
      playerTotalCoins={playerTotalCoins}
      qualificationThreshold={qualificationThreshold}
      muted={muted}
      resumePlaybackSignal={resumePlaybackSignal}
      watchPartyRoom={watchPartyRoom}
      watchPartyRole={watchPartyRole}
      watchPartyViewerCount={watchPartyViewerCount}
      watchPartyUsername={watchPartyUsername}
      onOpenWatchPartyLobby={onOpenWatchPartyLobby}
      onLeaveWatchParty={onLeaveWatchParty}
      onSyncHostPlayback={onSyncHostPlayback}
      onSwitchWatchPartyEpisode={onSwitchWatchPartyEpisode}
      onDeductSuperReactionCoins={onDeductSuperReactionCoins}
      onWatchBonusAd={onWatchBonusAd}
      onNotifyWatchParty={onNotifyWatchParty}
      onToggleMute={onToggleMute}
      onAwardCoinPot={onAwardCoinPot}
      onClaimGiftBoxCoins={onClaimGiftBoxCoins}
      onShareEpisode={onShareEpisode}
      onStartSponsorReward={onStartSponsorReward}
      onClaimHeroBonus={onClaimHeroBonus}
      onMarkEpisodeWatched={onMarkEpisodeWatched}
      onUnlockArchiveMovie={onUnlockArchiveMovie}
      onUnlockArchiveMovieWithAd={onUnlockArchiveMovieWithAd}
      onRecordWatchSeconds={onRecordWatchSeconds}
      onRecordEpisodeCompleted={onRecordEpisodeCompleted}
      onPlayerOpenChange={onPlayerOpenChange}
      closePlayerSignal={closePlayerSignal}
      onGoToBoost={onGoToBoost}
    />
  );
};
