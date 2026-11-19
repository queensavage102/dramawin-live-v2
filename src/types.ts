import { Timestamp } from 'firebase/firestore';

export type AppTab = 'watch' | 'foryou' | 'vault' | 'me';

export type WeekDayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface StreakDaySpec {
  key: WeekDayKey;
  label: string;
  reward: number;
}

export interface LeaderboardPlayer {
  uid: string;
  username: string;
  avatar?: string;
  coins: number;
  weeklyCoins: number;
  qualified: boolean;
  streakCount: number;
  sundayBonusZar?: number;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DramaSeries {
  id: string;
  seriesId: string;
  title: string;
  category: string;
  coverImage: string;
  synopsis: string;
  episodeIds: string[];
  sortOrder: number;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlayerPrivate {
  uid: string;
  contact: string;
  dailyGiftLastClaimed: string;
  weekKey: string;
  claimedDays: WeekDayKey[];
  watchedEpisodeIds: string[];
  lastKeepWatchingDate: string;
  lastBannerClaimAt: number;
  lastActivityDate?: string;
  lastMysteryPickDate?: string;
  openedMysteryBoxesDate?: string;
  openedMysteryBoxesToday?: number[];
  streakActivityDates?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DramaEpisode {
  id: string;
  title: string;
  series: string;
  seriesId?: string;
  category?: string;
  episodeLabel: string;
  duration: string;
  rewardCoins: number;
  coverImage: string;
  thumbnailUrl?: string;
  synopsis: string;
  sponsorUrl: string;
  youtubeUrl?: string;
  videoUrl?: string;
  startTime?: number;
  sortOrder: number;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedAtMs?: number;
}

export interface AppConfig {
  sponsorAdUrl: string;
  embeddedAdHtml?: string;
  poolPrizeZar: number;
  rolloverAmountZar?: number;
  poolWeekKey?: string;
  weekStartTimestamp?: number;
  lastPoolWinnerSummary?: string;
  lastWinnerUids?: string[];
  mysteryWinningBoxes?: number;
  r5WinnerUsername?: string;
  nextPickWinsR5?: boolean;
  liveTickerEnabled?: boolean;
  liveTickerNames?: string[];
  poolTargetCoins: number;
  qualificationThreshold: number;
  episodesSeeded: boolean;
  isPublic: boolean;
  updatedAt?: Timestamp;
}

export interface MysteryWinnerRecord {
  id: string;
  uid: string;
  username: string;
  contact: string;
  voucherCode: string;
  amountZar: number;
  boxNumber: number;
  createdAt?: Timestamp;
  createdAtMs?: number;
}

export type TransactionType = 'earn' | 'spend' | 'adjustment';

export type TransactionCategory =
  | 'daily-gift'
  | 'streak'
  | 'episode'
  | 'ad-break'
  | 'keep-watching'
  | 'banner'
  | 'mystery-box'
  | 'mystery-entry'
  | 'admin-adjustment';

export interface CoinTransaction {
  id: string;
  uid: string;
  type: TransactionType;
  category: TransactionCategory | string;
  title: string;
  amount: number;
  balanceAfter: number;
  createdAt?: Timestamp;
  createdAtMs?: number;
}

export interface ToastNotice {
  id: string;
  message: string;
  coinsAwarded?: number;
  tone?: 'gold' | 'neutral' | 'error' | 'reminder';
  actionLabel?: string;
  onAction?: () => void;
}

export type PrizeWinType = 'sunday_pool' | 'mystery_r3_boost' | 'mystery_11th_jackpot';

export interface PrizeWinRecord {
  id: string;
  uid: string;
  createdByUid: string;
  username: string;
  contact?: string;
  prizeType: PrizeWinType;
  amountZar: number;
  coinsAwarded: number;
  voucherCode?: string;
  boxNumber?: number;
  rank?: number;
  weekKey?: string;
  summary: string;
  status: 'recorded' | 'paid';
  createdAt?: Timestamp;
  createdAtMs?: number;
}

export type SupportCategory =
  | 'claim_prize'
  | 'coins'
  | 'mystery_box'
  | 'sunday_pool'
  | 'feedback'
  | 'other';

export type SupportStatus = 'open' | 'resolved';

export interface SupportMessageRecord {
  id: string;
  uid: string;
  username: string;
  contact: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportStatus;
  adminNote?: string;
  resolvedBy?: string;
  source?: 'cloud' | 'local';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdAtMs?: number;
  updatedAtMs?: number;
}
