import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithPopup } from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Crown, ExternalLink, Flame, Lock, Play, X } from 'lucide-react';
import { AdminBoardPage } from './components/AdminBoardPage';
import { BottomAdBanner } from './components/BottomAdBanner';
import { BottomNavBar } from './components/BottomNavBar';
import { CheckInVaultTab } from './components/CheckInVaultTab';
import { ConfettiExplosion } from './components/ConfettiExplosion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ForYouTab } from './components/ForYouTab';
import { InAppBrowserBanner } from './components/InAppBrowserBanner';
import { MeTab } from './components/MeTab';
import { MysteryRevealState, MysteryVaultCard } from './components/MysteryVaultCard';
import { RealisticGoldCoin } from './components/RealisticGoldCoin';
import { SupportChatWidget } from './components/SupportChatWidget';
import { TopHeader } from './components/TopHeader';
import { VipSplashScreen } from './components/VipSplashScreen';
import { WatchTab } from './components/WatchTab';
import {
  ADMIN_PASSCODE,
  BRAND_NAME,
  DEFAULT_POOL_PRIZE_ZAR,
  DEFAULT_QUALIFICATION_THRESHOLD,
  MYSTERY_CYCLE_BOXES,
  STREAK_DAYS,
  getCurrentWeekKey,
  getMondayStartTimestampSAST,
  getTodayDateKey,
  getTodayWeekdayKey,
  resolveSponsorLink,
  sanitizeExternalUrl,
} from './constants';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { auth, googleProvider } from './firebase';
import {
  adminAdjustPlayerCoins,
  awardHeroBonusCoins,
  awardMysteryBoxCoins,
  awardWatchPotCoins,
  claimStreakDay,
  ensureAdminSeededData,
  evaluateSundayPoolRollover,
  fetchPlayerProfile,
  markEpisodeAsWatched,
  mergeWatchedEpisodeId,
  purgeLegacyAndStrayEpisodesFromFirestore,
  recordPrizeWinAndNotifyEmail,
  resetPlayerCoinsToZero,
  subscribeAppConfig,
  subscribeLeaderboard,
  subscribeMysteryWinners,
  subscribePlayerPrivate,
  subscribePrizeWins,
  subscribeTransactions,
  unlockAdminAccess,
  updateEmbeddedAdHtml,
  updateLiveTickerConfig,
  updateMysteryAndRolloverConfig,
  updateSponsorAdUrl,
} from './services/dramawinService';
import {
  AppConfig,
  AppTab,
  CoinTransaction,
  DramaEpisode,
  LeaderboardPlayer,
  MysteryWinnerRecord,
  PlayerPrivate,
  PrizeWinRecord,
  ToastNotice,
  WeekDayKey,
} from './types';
import {
  addLocalPrizeWin,
  applyLocalCoinMutation,
  claimLocalMysteryBox,
  getOrCreateGuestSession,
  loadLocalAppConfig,
  loadLocalLeaderboard,
  loadLocalMysteryWinners,
  loadLocalPrizeWins,
  loadLocalTransactions,
  loadMyListSeriesIds,
  mergeLeaderboardWithSeedPlayers,
  resetLocalPlayerCoins,
  saveLocalAppConfig,
  toggleMyListSeriesId,
  updateLocalGuestUsername,
  upsertLocalLeaderboardPlayer,
} from './utils/localState';
import {
  playCoinChime,
  playCoinPotCashChime,
  playVictoryFanfare,
  setSoundMuted,
  unlockAudioEngine,
} from './utils/sound';

const ADMIN_SESSION_KEY = 'dramawin_admin_unlocked';
const CLOUD_OPENED_BOXES_PREFIX = 'dramawin_cloud_opened_boxes_';

function readCloudOpenedBoxes(uid: string, dateKey: string): number[] {
  try {
    const raw = window.localStorage.getItem(`${CLOUD_OPENED_BOXES_PREFIX}${uid}_${dateKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed.filter((n): n is number => typeof n === 'number');
    return cleaned.length >= MYSTERY_CYCLE_BOXES ? [] : cleaned;
  } catch {
    return [];
  }
}

function writeCloudOpenedBoxes(uid: string, dateKey: string, boxes: number[]): void {
  try {
    window.localStorage.setItem(`${CLOUD_OPENED_BOXES_PREFIX}${uid}_${dateKey}`, JSON.stringify(boxes));
  } catch {
    // Ignore storage quota errors
  }
}

function isAdminPath(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.replace(/\/+$/, '') === '/admin';
}

function DramaWinApp() {
  const {
    episodes,
    sections,
    cloudSeries,
    createSection,
    renameSection,
    deleteSection,
    updateSeriesPoster,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    reorderSeries,
    restoreCatalogDefaults,
  } = useCatalog();

  const initialSession = useMemo(() => getOrCreateGuestSession(), []);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<LeaderboardPlayer>(initialSession.player);
  const [guestPrivate, setGuestPrivate] = useState<PlayerPrivate>(initialSession.privateProfile);

  const [cloudPrivateProfile, setCloudPrivateProfile] = useState<PlayerPrivate | null>(null);
  const [cloudLeaderboard, setCloudLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [cloudAppConfig, setCloudAppConfig] = useState<AppConfig | null>(null);
  const [cloudWinners, setCloudWinners] = useState<MysteryWinnerRecord[]>([]);
  const [cloudTransactions, setCloudTransactions] = useState<CoinTransaction[]>([]);

  const [localLeaderboard, setLocalLeaderboard] = useState<LeaderboardPlayer[]>(() =>
    loadLocalLeaderboard(initialSession.player)
  );
  const [localAppConfig, setLocalAppConfig] = useState<AppConfig>(() => loadLocalAppConfig());
  const [localWinners, setLocalWinners] = useState<MysteryWinnerRecord[]>(() =>
    loadLocalMysteryWinners()
  );
  const [localTransactions, setLocalTransactions] = useState<CoinTransaction[]>(() =>
    loadLocalTransactions(initialSession.player.uid)
  );
  const [cloudPrizeWins, setCloudPrizeWins] = useState<PrizeWinRecord[]>([]);
  const [localPrizeWins, setLocalPrizeWins] = useState<PrizeWinRecord[]>(() =>
    loadLocalPrizeWins()
  );

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => isAdminPath());
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('watch');
  const [giftVaultModalOpen, setGiftVaultModalOpen] = useState(false);
  const [myListSeriesIds, setMyListSeriesIds] = useState<string[]>(() => loadMyListSeriesIds());
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [cloudOpenedBoxes, setCloudOpenedBoxes] = useState<number[]>([]);
  const [mysteryReveal, setMysteryReveal] = useState<MysteryRevealState | null>(null);
  const [pendingGiftBoxNumber, setPendingGiftBoxNumber] = useState<number | null>(null);
  const [mysteryVoucherModal, setMysteryVoucherModal] = useState<{
    winner: MysteryWinnerRecord;
    newPoolPrizeZar?: number;
  } | null>(null);

  const [muted, setMuted] = useState<boolean>(() => {
    setSoundMuted(false);
    return false;
  });
  const [confettiActive, setConfettiActive] = useState(false);
  const [splashDone, setSplashDone] = useState<boolean>(() => isAdminPath());
  const [sponsorLoading, setSponsorLoading] = useState<{
    progress: number;
    secondsLeft: number;
    completed?: boolean;
  } | null>(null);
  const [resumePlaybackSignal, setResumePlaybackSignal] = useState(0);

  const streakReminderShownRef = useRef<string | null>(null);
  const purgedStrayFirestoreRef = useRef<boolean>(false);
  const triedAnonAuthRef = useRef<boolean>(false);
  const pendingGiftBoxNumberRef = useRef<number | null>(null);
  const cloudOpenedBoxesRef = useRef<number[]>(cloudOpenedBoxes);
  const toastTimerRef = useRef<number | null>(null);
  const sponsorIntervalRef = useRef<number | null>(null);
  const sponsorRafRef = useRef<number | null>(null);
  const sponsorFlowRef = useRef<{
    active: boolean;
    startedAt: number;
    durationMs: number;
    activeElapsedMs: number;
    lastVisibleTick: number;
    leftApp: boolean;
    isMysteryBox: boolean;
    pushedHistory: boolean;
    rewardAction: (() => Promise<void>) | null;
  }>({
    active: false,
    startedAt: 0,
    durationMs: 20000,
    activeElapsedMs: 0,
    lastVisibleTick: 0,
    leftApp: false,
    isMysteryBox: false,
    pushedHistory: false,
    rewardAction: null,
  });

  const stopSponsorTimers = useCallback(() => {
    if (sponsorIntervalRef.current !== null) {
      window.clearInterval(sponsorIntervalRef.current);
      sponsorIntervalRef.current = null;
    }
    if (sponsorRafRef.current !== null) {
      window.cancelAnimationFrame(sponsorRafRef.current);
      sponsorRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    cloudOpenedBoxesRef.current = cloudOpenedBoxes;
  }, [cloudOpenedBoxes]);

  useEffect(() => {
    pendingGiftBoxNumberRef.current = pendingGiftBoxNumber;
  }, [pendingGiftBoxNumber]);

  const finishSponsorRewardFlow = useCallback(() => {
    const flow = sponsorFlowRef.current;
    if (!flow.active) return;
    const isMystery = flow.isMysteryBox || pendingGiftBoxNumberRef.current !== null;
    if (!isMystery && (document.hidden || document.visibilityState === 'hidden')) {
      return;
    }
    flow.active = false;
    flow.leftApp = false;
    stopSponsorTimers();
    const pendingReward = flow.rewardAction;
    flow.rewardAction = null;

    if (isMystery) {
      setSponsorLoading(null);
      setPendingGiftBoxNumber(null);
      setResumePlaybackSignal((prev) => prev + 1);
    } else {
      setSponsorLoading({ progress: 100, secondsLeft: 0, completed: true });
    }

    if (pendingReward) {
      void pendingReward().catch(() => {});
    }
  }, [stopSponsorTimers]);

  const cancelSponsorRewardFlowEarly = useCallback(
    (showEarlyNotice = false, fromPopState = false) => {
      const flow = sponsorFlowRef.current;
      if (!flow.active) return;
      flow.active = false;
      flow.startedAt = 0;
      flow.activeElapsedMs = 0;
      flow.lastVisibleTick = 0;
      flow.leftApp = false;
      flow.rewardAction = null;
      stopSponsorTimers();
      if (!fromPopState && flow.pushedHistory) {
        flow.pushedHistory = false;
        try {
          window.history.back();
        } catch {
          // Ignore history back errors
        }
      } else {
        flow.pushedHistory = false;
      }
      setSponsorLoading(null);
      setPendingGiftBoxNumber(null);
      setResumePlaybackSignal((prev) => prev + 1);
      if (showEarlyNotice) {
        const toastId = `${Date.now()}-early-ad`;
        if (toastTimerRef.current !== null) {
          window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = null;
        }
        setToast({
          id: toastId,
          message: 'Sponsor ad closed early — watch for 20s to unlock your Gift Box.',
          tone: 'neutral',
        });
        toastTimerRef.current = window.setTimeout(() => {
          setToast((current) => (current?.id === toastId ? null : current));
          toastTimerRef.current = null;
        }, 4000);
      }
    },
    [stopSponsorTimers]
  );

  const startSponsorRewardFlow = useCallback(
    (rewardAction?: () => Promise<void>) => {
      stopSponsorTimers();
      if (sponsorFlowRef.current.active && sponsorFlowRef.current.rewardAction) {
        sponsorFlowRef.current.rewardAction = null;
      }
      setPendingGiftBoxNumber(null);
      const durationMs = 20000;
      sponsorFlowRef.current = {
        active: true,
        startedAt: Date.now(),
        durationMs,
        activeElapsedMs: 0,
        lastVisibleTick: document.hidden ? 0 : Date.now(),
        leftApp: false,
        isMysteryBox: false,
        pushedHistory: false,
        rewardAction: rewardAction || null,
      };
      setSponsorLoading({ progress: 0, secondsLeft: 20, completed: false });
    },
    [stopSponsorTimers]
  );

  const isSponsorFlowActive = Boolean(sponsorLoading && !sponsorLoading.completed);

  useEffect(() => {
    if (!isSponsorFlowActive) return;

    const totalMs = sponsorFlowRef.current.durationMs || 20000;
    const isMystery = sponsorFlowRef.current.isMysteryBox || pendingGiftBoxNumberRef.current !== null;

    if (!isMystery && typeof window !== 'undefined' && !sponsorFlowRef.current.pushedHistory) {
      try {
        window.history.pushState({ dramawinSponsorAd: true }, '');
        sponsorFlowRef.current.pushedHistory = true;
      } catch {
        // Ignore history restrictions
      }
    }

    // Strict useRef interval timer enforcing 20s visible completion
    sponsorIntervalRef.current = window.setInterval(() => {
      const flow = sponsorFlowRef.current;
      if (!flow.active) {
        stopSponsorTimers();
        return;
      }

      if (flow.isMysteryBox || pendingGiftBoxNumberRef.current !== null) {
        const elapsed = Date.now() - flow.startedAt;
        const progress = Math.min(100, (elapsed / totalMs) * 100);
        const secondsLeft = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
        setSponsorLoading({ progress, secondsLeft, completed: false });
        if (elapsed >= totalMs) {
          finishSponsorRewardFlow();
        }
        return;
      }

      // Non-mystery strict mode: immediate zero-coin abort if tab hidden or app switched
      if (document.hidden || document.visibilityState === 'hidden') {
        cancelSponsorRewardFlowEarly(false, false);
        return;
      }

      const elapsed = Date.now() - flow.startedAt;
      const secondsLeft = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSponsorLoading((prev) =>
        prev && !prev.completed
          ? { ...prev, secondsLeft }
          : { progress: Math.min(100, (elapsed / totalMs) * 100), secondsLeft, completed: false }
      );

      if (elapsed >= totalMs) {
        finishSponsorRewardFlow();
      }
    }, 100);

    // Smooth 60fps progress & circular countdown ring updates
    if (!isMystery) {
      const tick60fps = () => {
        const flow = sponsorFlowRef.current;
        if (!flow.active || flow.isMysteryBox || pendingGiftBoxNumberRef.current !== null) return;
        if (document.hidden || document.visibilityState === 'hidden') {
          cancelSponsorRewardFlowEarly(false, false);
          return;
        }
        const elapsed = Date.now() - flow.startedAt;
        const progress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
        const secondsLeft = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
        setSponsorLoading({ progress, secondsLeft, completed: false });

        if (elapsed >= totalMs) {
          finishSponsorRewardFlow();
          return;
        }
        sponsorRafRef.current = window.requestAnimationFrame(tick60fps);
      };
      sponsorRafRef.current = window.requestAnimationFrame(tick60fps);
    }

    const handleLeave = () => {
      if (sponsorFlowRef.current.active && pendingGiftBoxNumberRef.current !== null) {
        sponsorFlowRef.current.leftApp = true;
      }
    };

    const handleVisibility = () => {
      const flow = sponsorFlowRef.current;
      if (!flow.active) return;

      if (flow.isMysteryBox || pendingGiftBoxNumberRef.current !== null) {
        if (document.visibilityState === 'hidden') {
          flow.leftApp = true;
          return;
        }
        if (document.visibilityState === 'visible' && flow.leftApp) {
          const elapsed = Date.now() - flow.startedAt;
          if (elapsed >= totalMs) {
            finishSponsorRewardFlow();
          } else {
            cancelSponsorRewardFlowEarly(true);
          }
        }
        return;
      }

      if (document.hidden || document.visibilityState === 'hidden') {
        cancelSponsorRewardFlowEarly(false, false);
      }
    };

    const handlePageHide = () => {
      const flow = sponsorFlowRef.current;
      if (!flow.active) return;
      if (!flow.isMysteryBox && pendingGiftBoxNumberRef.current === null) {
        cancelSponsorRewardFlowEarly(false, false);
      }
    };

    const handleFocusReturn = () => {
      if (
        !sponsorFlowRef.current.active ||
        !sponsorFlowRef.current.leftApp ||
        pendingGiftBoxNumberRef.current === null
      ) {
        return;
      }
      const elapsed = Date.now() - sponsorFlowRef.current.startedAt;
      if (elapsed >= totalMs) {
        finishSponsorRewardFlow();
      } else {
        cancelSponsorRewardFlowEarly(true);
      }
    };

    const handlePopState = () => {
      const flow = sponsorFlowRef.current;
      if (!flow.active || pendingGiftBoxNumberRef.current !== null) return;
      flow.pushedHistory = false;
      cancelSponsorRewardFlowEarly(false, true);
    };

    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleFocusReturn);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopSponsorTimers();
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleFocusReturn);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isSponsorFlowActive, finishSponsorRewardFlow, cancelSponsorRewardFlowEarly, stopSponsorTimers]);

  // Use cloud session only if user is signed into Firebase Auth AND has a cloud profile;
  // otherwise run 100% seamlessly in instant localStorage mode with zero auth wall.
  const isCloudMode = Boolean(firebaseUser && cloudPrivateProfile);

  const currentPlayer: LeaderboardPlayer = useMemo(() => {
    if (isCloudMode && firebaseUser) {
      return (
        cloudLeaderboard.find((p) => p.uid === firebaseUser.uid) || {
          uid: firebaseUser.uid,
          username: 'Player',
          coins: 0,
          weeklyCoins: 0,
          qualified: false,
          streakCount: cloudPrivateProfile?.claimedDays?.length || 0,
          isPublic: true,
        }
      );
    }
    return guestPlayer;
  }, [isCloudMode, firebaseUser, cloudLeaderboard, cloudPrivateProfile, guestPlayer]);

  const privateProfile: PlayerPrivate = useMemo(
    () => (isCloudMode && cloudPrivateProfile ? cloudPrivateProfile : guestPrivate),
    [isCloudMode, cloudPrivateProfile, guestPrivate]
  );

  const leaderboard: LeaderboardPlayer[] = useMemo(
    () =>
      mergeLeaderboardWithSeedPlayers(
        isCloudMode ? cloudLeaderboard : localLeaderboard,
        currentPlayer
      ),
    [isCloudMode, cloudLeaderboard, localLeaderboard, currentPlayer]
  );

  const appConfig: AppConfig = useMemo(() => {
    const base = cloudAppConfig ? cloudAppConfig : localAppConfig;
    return {
      ...base,
      sponsorAdUrl: resolveSponsorLink(base.sponsorAdUrl),
    };
  }, [cloudAppConfig, localAppConfig]);

  const mysteryWinners: MysteryWinnerRecord[] = useMemo(
    () => (isCloudMode ? cloudWinners : localWinners),
    [isCloudMode, cloudWinners, localWinners]
  );

  const transactions: CoinTransaction[] = useMemo(
    () => (isCloudMode ? cloudTransactions : localTransactions),
    [isCloudMode, cloudTransactions, localTransactions]
  );

  const prizeWins: PrizeWinRecord[] = useMemo(() => {
    const merged = new Map<string, PrizeWinRecord>();
    cloudPrizeWins.forEach((w) => merged.set(w.id, w));
    localPrizeWins.forEach((w) => {
      if (!merged.has(w.id)) merged.set(w.id, w);
    });
    return Array.from(merged.values()).sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || a.createdAtMs || 0;
      const tB = b.createdAt?.toMillis?.() || b.createdAtMs || 0;
      return tB - tA;
    });
  }, [cloudPrizeWins, localPrizeWins]);

  const latestStateRef = useRef({
    isCloudMode,
    firebaseUser,
    currentPlayer,
    privateProfile,
    appConfig,
    muted,
  });

  useEffect(() => {
    latestStateRef.current = {
      isCloudMode,
      firebaseUser,
      currentPlayer,
      privateProfile,
      appConfig,
      muted,
    };
  }, [isCloudMode, firebaseUser, currentPlayer, privateProfile, appConfig, muted]);

  // Unlock Web Audio engine on first user gesture
  useEffect(() => {
    const unlock = () => {
      unlockAudioEngine();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Listen to browser history popstate for /admin route sync
  useEffect(() => {
    const handlePop = () => {
      setIsAdminRoute(isAdminPath());
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, []);

  const navigateToAdmin = () => {
    if (typeof window !== 'undefined' && !isAdminPath()) {
      window.history.pushState({}, '', '/admin');
    }
    setIsAdminRoute(true);
  };

  const navigateToApp = () => {
    if (typeof window !== 'undefined' && isAdminPath()) {
      window.history.pushState({}, '', '/');
    }
    setIsAdminRoute(false);
  };

  const showToast = useCallback(
    (
      message: string,
      coinsAwarded?: number,
      tone: ToastNotice['tone'] = 'gold',
      action?: { label: string; onClick: () => void },
      durationMs = 4000
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToast({
        id,
        message,
        coinsAwarded,
        tone,
        actionLabel: action?.label,
        onAction: action?.onClick,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        toastTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    unlockAudioEngine();
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  }, []);

  // Always subscribe to public Firestore appConfig for ALL visitors (zero auth wall)
  useEffect(() => {
    const unsubConfig = subscribeAppConfig(
      (cfg) => {
        const normalized: AppConfig = {
          ...cfg,
          sponsorAdUrl: resolveSponsorLink(cfg.sponsorAdUrl),
        };
        setCloudAppConfig(normalized);
        setLocalAppConfig(saveLocalAppConfig(normalized));
      },
      () => {
        // Keep local fallback active if Firestore is unreachable
      }
    );

    return () => {
      unsubConfig();
    };
  }, []);

  // Silent background Firebase guest auth + full cloud sync for verified Google players & admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCloudPrivateProfile(null);
        setCloudLeaderboard([]);
        setCloudWinners([]);
        setCloudTransactions([]);
        setCloudPrizeWins([]);
        setCloudOpenedBoxes([]);
        if (!triedAnonAuthRef.current) {
          triedAnonAuthRef.current = true;
          void signInAnonymously(auth).catch(() => {
            // Keep instant local play active even if anonymous auth is unavailable
          });
        }
        return;
      }

      // Anonymous guest users stay in instant local coin mode with zero permission errors,
      // while remaining authenticated in Firebase for Support Messages & Prize Claims.
      if (user.isAnonymous) {
        setCloudPrivateProfile(null);
        setCloudOpenedBoxes([]);
        return;
      }

      setCloudOpenedBoxes(readCloudOpenedBoxes(user.uid, getTodayDateKey()));
      try {
        const { privateProfile: loadedPrivate } = await fetchPlayerProfile(user.uid);
        setCloudPrivateProfile(loadedPrivate);
      } catch {
        setCloudPrivateProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Automatically purge stray Gojo/anime or legacy broken episode docs from Firestore once an admin is signed in
  useEffect(() => {
    if (!firebaseUser || purgedStrayFirestoreRef.current) return;
    const isOwnerOrAdmin =
      firebaseUser.email === 'gerinaicker04@gmail.com' || adminUnlocked;
    if (!isOwnerOrAdmin) return;
    purgedStrayFirestoreRef.current = true;
    void purgeLegacyAndStrayEpisodesFromFirestore().then(() =>
      ensureAdminSeededData().catch(() => {})
    );
  }, [firebaseUser, adminUnlocked]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubWinners = adminUnlocked
      ? subscribeMysteryWinners(setCloudWinners, () => {})
      : () => {};
    const unsubPrizeWins = adminUnlocked
      ? subscribePrizeWins(setCloudPrizeWins, () => {})
      : () => {};

    if (!cloudPrivateProfile) {
      return () => {
        unsubWinners();
        unsubPrizeWins();
      };
    }

    const unsubLeaderboard = subscribeLeaderboard(setCloudLeaderboard);
    const unsubPrivate = subscribePlayerPrivate(firebaseUser.uid, (nextPriv) => {
      if (nextPriv) setCloudPrivateProfile(nextPriv);
    });
    const unsubTransactions = subscribeTransactions(firebaseUser.uid, setCloudTransactions);

    return () => {
      unsubLeaderboard();
      unsubPrivate();
      unsubTransactions();
      unsubWinners();
      unsubPrizeWins();
    };
  }, [firebaseUser, cloudPrivateProfile?.uid, adminUnlocked]);

  // Subtle Daily Streak Reminder once per day on first visit if today's check-in is open
  useEffect(() => {
    if (isAdminRoute) return;
    const uid = currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const currentWeek = getCurrentWeekKey();
    const todayWeekday = getTodayWeekdayKey();
    const claimedDays =
      privateProfile.weekKey === currentWeek ? privateProfile.claimedDays || [] : [];

    if (claimedDays.includes(todayWeekday)) {
      setToast((current) => (current?.tone === 'reminder' ? null : current));
      return;
    }

    const sessionStamp = `${uid}:${todayKey}`;
    if (streakReminderShownRef.current === sessionStamp) return;

    try {
      if (window.localStorage.getItem(`dramawin_streak_reminder_${uid}`) === todayKey) {
        streakReminderShownRef.current = sessionStamp;
        return;
      }
    } catch {
      // Ignore storage errors
    }

    const timer = window.setTimeout(() => {
      streakReminderShownRef.current = sessionStamp;
      try {
        window.localStorage.setItem(`dramawin_streak_reminder_${uid}`, todayKey);
      } catch {
        // Ignore storage errors
      }
      const todaySpec = STREAK_DAYS.find((d) => d.key === todayWeekday);
      const reward = todaySpec?.reward ?? 100;
      showToast(
        `Daily Streak Reminder: Claim ${todayWeekday} (+${reward} Coins) to keep your streak going.`,
        undefined,
        'reminder',
        {
          label: 'Check In',
          onClick: () => {
            setActiveTab('vault');
            window.setTimeout(() => {
              document.getElementById('daily-checkin-box')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }, 80);
          },
        },
        5000
      );
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [isAdminRoute, currentPlayer.uid, privateProfile.weekKey, privateProfile.claimedDays, showToast]);

  const qualificationThreshold =
    appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

  const qualifiedCount = useMemo(
    () =>
      leaderboard.filter((p) => (p.weeklyCoins || 0) >= qualificationThreshold).length,
    [leaderboard, qualificationThreshold]
  );

  const sundayBonusZar = useMemo(() => {
    const awardedBalance = currentPlayer.sundayBonusZar || 0;
    const isSunday = getTodayWeekdayKey() === 'Sun';
    if (!isSunday || qualifiedCount < 3) return awardedBalance;

    const pool = appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR;
    const qualifiedTop3 = leaderboard
      .filter((p) => (p.weeklyCoins || 0) >= qualificationThreshold)
      .slice(0, 3);
    const qualifiedIndex = qualifiedTop3.findIndex((p) => p.uid === currentPlayer.uid);

    let liveShare = 0;
    if (qualifiedIndex === 0) liveShare = Math.round(pool * 0.5);
    else if (qualifiedIndex === 1) liveShare = Math.round(pool * 0.3);
    else if (qualifiedIndex === 2) liveShare = Math.round(pool * 0.2);

    return awardedBalance + liveShare;
  }, [
    currentPlayer,
    leaderboard,
    qualifiedCount,
    appConfig.poolPrizeZar,
    qualificationThreshold,
  ]);

  const resolveGiftBoxOutcome = useCallback(
    (boxNumber: number) => {
      setPendingGiftBoxNumber(null);
      const todayKey = getTodayDateKey();
      const {
        isCloudMode: cloudNow,
        firebaseUser: activeUser,
        currentPlayer: player,
        privateProfile: priv,
        appConfig: latestCfg,
        muted: isMutedNow,
      } = latestStateRef.current;

      if (cloudNow && activeUser) {
        const rawOpened = cloudOpenedBoxesRef.current;
        const currentOpened = rawOpened.length >= MYSTERY_CYCLE_BOXES ? [] : rawOpened;
        if (currentOpened.includes(boxNumber)) {
          return;
        }

        const nextOpenedRaw = Array.from(new Set([...currentOpened, boxNumber]));
        const is11thBoxJackpot = nextOpenedRaw.length >= MYSTERY_CYCLE_BOXES;
        // Auto-reset immediately back to 0 / 11 Boxes Opened on Box #11
        const persistedOpened = is11thBoxJackpot ? [] : nextOpenedRaw;
        cloudOpenedBoxesRef.current = persistedOpened;
        setCloudOpenedBoxes(persistedOpened);
        writeCloudOpenedBoxes(activeUser.uid, todayKey, persistedOpened);

        const threshold = latestCfg.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

        if (is11thBoxJackpot) {
          setMysteryReveal({
            dateKey: todayKey,
            boxNumber,
            kind: 'jackpot',
            coins: 1500,
          });
          setConfettiActive(true);
          playCoinPotCashChime(isMutedNow);
          playVictoryFanfare(isMutedNow);
          showToast(
            '🎉 Surprise! +1,500 Bonus Coins! Vault reset — tap any box to start a new 11-box cycle!',
            1500
          );
          void awardMysteryBoxCoins(
            player,
            priv,
            boxNumber,
            1500,
            threshold,
            true
          ).catch(() => {});
        } else {
          setMysteryReveal({
            dateKey: todayKey,
            boxNumber,
            kind: 'coins',
            coins: 100,
          });
          playCoinChime(isMutedNow);
          showToast(`🎁 Gift Box #${boxNumber} Opened! +100 Coins Added to Wallet!`, 100);
          void awardMysteryBoxCoins(
            player,
            priv,
            boxNumber,
            100,
            threshold,
            false
          ).catch(() => {});
        }
        return;
      }

      try {
        const result = claimLocalMysteryBox({
          player,
          privateProfile: priv,
          boxNumber,
          paidWithCoins: false,
          appConfig: latestCfg,
        });
        setGuestPlayer(result.player);
        setGuestPrivate(result.privateProfile);
        setLocalTransactions(result.transactions);
        setLocalLeaderboard(loadLocalLeaderboard(result.player));

        const revealPayload: MysteryRevealState = {
          dateKey: todayKey,
          boxNumber,
          kind: result.outcome.kind,
          coins: result.outcome.coins,
        };
        setMysteryReveal(revealPayload);

        if (result.outcome.kind === 'jackpot') {
          setConfettiActive(true);
          playCoinPotCashChime(isMutedNow);
          playVictoryFanfare(isMutedNow);
          showToast(
            '🎉 Surprise! +1,500 Bonus Coins! Vault reset — tap any box to start a new 11-box cycle!',
            1500
          );
        } else {
          playCoinChime(isMutedNow);
          showToast(
            `🎁 Gift Box #${boxNumber} Opened! +${result.outcome.coins} Coins Added to Wallet!`,
            result.outcome.coins
          );
        }
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Unable to open Mystery Box.',
          undefined,
          'error'
        );
      }
    },
    [showToast]
  );

  // Mystery Box Flow: opens MONETAG_LINK in a new tab and awards +100 Coins (+1,500 Bonus Coins on Box #11 + grid reset)
  const handleOpenMysteryBox = (boxNumber: number) => {
    const todayKey = getTodayDateKey();
    const rawOpened = isCloudMode
      ? cloudOpenedBoxes
      : privateProfile.openedMysteryBoxesDate === todayKey
        ? privateProfile.openedMysteryBoxesToday || []
        : [];
    const openedToday = rawOpened.length >= MYSTERY_CYCLE_BOXES ? [] : rawOpened;

    if (openedToday.includes(boxNumber)) {
      return;
    }

    const activeSponsorLink = resolveSponsorLink(appConfig.sponsorAdUrl);
    if (activeSponsorLink && activeSponsorLink !== '#') {
      window.open(activeSponsorLink, '_blank', 'noopener,noreferrer');
    }
    resolveGiftBoxOutcome(boxNumber);
  };

  const handleOpenGiftVaultFromHeader = () => {
    setGiftVaultModalOpen(true);
  };

  const handleDismissGiftVaultModal = useCallback(() => {
    setGiftVaultModalOpen(false);
  }, []);

  useEffect(() => {
    if (!giftVaultModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismissGiftVaultModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [giftVaultModalOpen, handleDismissGiftVaultModal]);

  const handleCompleteDailyCheckIn = async (dayKey: WeekDayKey, reward: number) => {
    const currentWeek = getCurrentWeekKey();
    const baseClaimed =
      privateProfile.weekKey === currentWeek ? privateProfile.claimedDays || [] : [];
    if (baseClaimed.includes(dayKey)) return;

    const threshold = appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
    if (isCloudMode) {
      const awarded = await claimStreakDay(
        currentPlayer,
        privateProfile,
        dayKey,
        reward,
        threshold
      );
      if (awarded) {
        playCoinChime(muted);
        showToast(
          `+${reward} Coins Added to Wallet! (${dayKey} Check-In)`,
          reward,
          'gold',
          undefined,
          3000
        );
      }
      return;
    }

    const nextClaimed = [...baseClaimed, dayKey].slice(0, 7);
    const res = applyLocalCoinMutation({
      player: currentPlayer,
      privateProfile,
      walletDelta: reward,
      qualificationThreshold: threshold,
      privateUpdates: {
        weekKey: currentWeek,
        claimedDays: nextClaimed,
      },
      nextStreakCount: nextClaimed.length,
      recordStreakActivity: true,
      txMeta: { category: 'streak', title: `${dayKey} Daily Check-In` },
    });
    setGuestPlayer(res.player);
    setGuestPrivate(res.privateProfile);
    setLocalTransactions(res.transactions);
    setLocalLeaderboard(loadLocalLeaderboard(res.player));
    playCoinChime(muted);
    showToast(
      `+${reward} Coins Added to Wallet! (${dayKey} Check-In)`,
      reward,
      'gold',
      undefined,
      3000
    );
  };

  const handleUpdatePlayerName = async (newName: string) => {
    if (isCloudMode && firebaseUser) {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      await updateDoc(doc(db, 'leaderboard', firebaseUser.uid), {
        username: newName.trim().slice(0, 32),
        updatedAt: serverTimestamp(),
      });
      showToast(`Leaderboard name updated to "${newName.trim()}"`);
      return;
    }
    const updated = updateLocalGuestUsername(guestPlayer, newName);
    setGuestPlayer(updated);
    setLocalLeaderboard(loadLocalLeaderboard(updated));
    showToast(`Leaderboard name updated to "${updated.username}"`);
  };

  const handleResetMyCoins = async () => {
    if (isCloudMode && firebaseUser) {
      await resetPlayerCoinsToZero(firebaseUser.uid);
      showToast('Coins reset to 0 for testing.', undefined, 'neutral');
      return;
    }
    const { player: resetPlayer, leaderboard: nextLb } = resetLocalPlayerCoins(guestPlayer);
    setGuestPlayer(resetPlayer);
    setLocalLeaderboard(nextLb);
    showToast('Coins reset to 0 for testing.', undefined, 'neutral');
  };

  const handleMarkEpisodeWatched = useCallback(async (episode: DramaEpisode): Promise<void> => {
    const {
      isCloudMode: cloudNow,
      currentPlayer: playerNow,
      privateProfile: privNow,
      appConfig: cfgNow,
    } = latestStateRef.current;

    const nextWatched = mergeWatchedEpisodeId(privNow.watchedEpisodeIds || [], episode.id);
    if (nextWatched.length === (privNow.watchedEpisodeIds || []).length) {
      return;
    }

    if (cloudNow) {
      await markEpisodeAsWatched(playerNow.uid, privNow, episode.id);
      return;
    }

    const threshold = cfgNow.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
    const res = applyLocalCoinMutation({
      player: playerNow,
      privateProfile: privNow,
      walletDelta: 0,
      qualificationThreshold: threshold,
      privateUpdates: {
        watchedEpisodeIds: nextWatched,
      },
    });
    setGuestPlayer(res.player);
    setGuestPrivate(res.privateProfile);
  }, []);

  const handleAwardCoinPot = useCallback(
    async (episode: DramaEpisode, amount: number): Promise<void> => {
      const {
        isCloudMode: cloudNow,
        currentPlayer: playerNow,
        privateProfile: privNow,
        appConfig: cfgNow,
        muted: mutedNow,
      } = latestStateRef.current;

      const safeAmount = Math.max(100, Math.min(600, Math.round(amount)));
      const threshold = cfgNow.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
      const nextWatched = mergeWatchedEpisodeId(privNow.watchedEpisodeIds || [], episode.id);

      if (cloudNow) {
        await awardWatchPotCoins(
          playerNow,
          privNow,
          safeAmount,
          threshold,
          episode.title,
          episode.id
        );
        playCoinPotCashChime(mutedNow);
        showToast(`+${safeAmount} Coins Added to Wallet!`, safeAmount, 'gold', undefined, 3000);
        return;
      }

      const res = applyLocalCoinMutation({
        player: playerNow,
        privateProfile: privNow,
        walletDelta: safeAmount,
        qualificationThreshold: threshold,
        privateUpdates: {
          watchedEpisodeIds: nextWatched,
        },
        recordStreakActivity: true,
        txMeta: {
          category: 'episode',
          title: `Coin Pot: ${episode.title}`.slice(0, 100),
        },
      });
      setGuestPlayer(res.player);
      setGuestPrivate(res.privateProfile);
      setLocalTransactions(res.transactions);
      setLocalLeaderboard(loadLocalLeaderboard(res.player));
      playCoinPotCashChime(mutedNow);
      showToast(`+${safeAmount} Coins Added to Wallet!`, safeAmount, 'gold', undefined, 3000);
    },
    [showToast]
  );

  const handleClaimHeroBonus = useCallback(async (): Promise<void> => {
    const {
      isCloudMode: cloudNow,
      currentPlayer: playerNow,
      privateProfile: privNow,
      appConfig: cfgNow,
      muted: mutedNow,
    } = latestStateRef.current;

    const bonusCoins = 100;
    const threshold = cfgNow.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

    if (cloudNow) {
      await awardHeroBonusCoins(playerNow, privNow, bonusCoins, threshold);
      playCoinChime(mutedNow);
      showToast(`+${bonusCoins} Coins Added to Wallet!`, bonusCoins, 'gold', undefined, 3000);
      return;
    }

    const res = applyLocalCoinMutation({
      player: playerNow,
      privateProfile: privNow,
      walletDelta: bonusCoins,
      qualificationThreshold: threshold,
      recordStreakActivity: true,
      txMeta: {
        category: 'banner',
        title: 'Hero Carousel Bonus Claim',
      },
    });
    setGuestPlayer(res.player);
    setGuestPrivate(res.privateProfile);
    setLocalTransactions(res.transactions);
    setLocalLeaderboard(loadLocalLeaderboard(res.player));
    playCoinChime(mutedNow);
    showToast(`+${bonusCoins} Coins Added to Wallet!`, bonusCoins, 'gold', undefined, 3000);
  }, [showToast]);

  const handleToggleMyList = useCallback(
    (seriesId: string, seriesName: string) => {
      const { list, added } = toggleMyListSeriesId(seriesId);
      setMyListSeriesIds(list);
      showToast(
        added ? `Saved "${seriesName}" to My List` : `Removed "${seriesName}" from My List`,
        undefined,
        added ? 'gold' : 'neutral',
        undefined,
        2400
      );
    },
    [showToast]
  );

  const handleShareEpisode = useCallback(
    (episode: DramaEpisode) => {
      const shareTitle = `${episode.series} — ${episode.title}`;
      const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        void navigator
          .share({
            title: shareTitle,
            text: `Watch ${shareTitle} on ${BRAND_NAME}!`,
            url: shareUrl,
          })
          .catch(() => {
            // User dismissed native share sheet
          });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
        void navigator.clipboard
          .writeText(shareUrl)
          .then(() => {
            showToast('Series link copied to share!', undefined, 'neutral', undefined, 2500);
          })
          .catch(() => {
            showToast('Share link ready in browser address bar.', undefined, 'neutral', undefined, 2500);
          });
      }
    },
    [showToast]
  );

  const handleSundayZeroTick = useCallback(() => {
    if (!adminUnlocked || leaderboard.length === 0 || !isCloudMode) return;
    void evaluateSundayPoolRollover(appConfig, leaderboard).then((res) => {
      if (res.outcome === 'distributed') {
        setConfettiActive(true);
        playVictoryFanfare(muted);
        showToast(`Sunday Pool Distributed! ${res.summary}`);
      } else {
        showToast(`🔥 ROLLOVER JACKPOT: R${res.nextPoolZar} carried forward!`);
      }
    });
  }, [adminUnlocked, isCloudMode, appConfig, leaderboard, muted, showToast]);

  const ensureFirebaseAdminGrant = async (): Promise<User | null> => {
    const activeUser = firebaseUser || auth.currentUser;
    if (!activeUser) return null;
    try {
      await unlockAdminAccess(activeUser.uid, ADMIN_PASSCODE);
    } catch {
      // Primary admin email does not require admins/{uid} doc if email matches rule
    }
    return activeUser;
  };

  // Admin Handlers (syncs locally immediately + writes live to Firebase Firestore when signed in)
  const handleUnlockAdmin = async (passcode: string) => {
    if (passcode !== ADMIN_PASSCODE) {
      throw new Error('Invalid password. Access denied.');
    }
    try {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch {
      // Ignore sessionStorage restrictions
    }
    setAdminUnlocked(true);
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        await unlockAdminAccess(activeUser.uid, passcode);
      } catch {
        // Ignore cloud sync error in local guest mode
      }
    }
  };

  const handleConnectFirebaseAdmin = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setFirebaseUser(cred.user);
    await unlockAdminAccess(cred.user.uid, ADMIN_PASSCODE);
  };

  const handleLockAdmin = () => {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // Ignore sessionStorage restrictions
    }
    setAdminUnlocked(false);
  };

  const handleUpdateSponsorUrl = async (newUrl: string) => {
    const sanitized = sanitizeExternalUrl(newUrl).slice(0, 500);
    const nextCfg = saveLocalAppConfig({ ...appConfig, sponsorAdUrl: sanitized });
    setLocalAppConfig(nextCfg);
    setCloudAppConfig(nextCfg);

    const activeUser = await ensureFirebaseAdminGrant();
    if (activeUser) {
      await updateSponsorAdUrl(sanitized, nextCfg);
    }
  };

  const handleUpdateEmbeddedAdHtml = async (html: string) => {
    const nextCfg = saveLocalAppConfig({ ...appConfig, embeddedAdHtml: html });
    setLocalAppConfig(nextCfg);
    setCloudAppConfig(nextCfg);

    const activeUser = await ensureFirebaseAdminGrant();
    if (activeUser) {
      await updateEmbeddedAdHtml(html, nextCfg);
    }
  };

  const handleUpdateLiveTicker = async (enabled: boolean, names: string[]) => {
    const nextCfg = saveLocalAppConfig({
      ...appConfig,
      liveTickerEnabled: enabled,
      liveTickerNames: names,
    });
    setLocalAppConfig(nextCfg);
    setCloudAppConfig(nextCfg);

    const activeUser = await ensureFirebaseAdminGrant();
    if (activeUser) {
      await updateLiveTickerConfig(nextCfg, enabled, names);
    }
  };

  const handleUpdateMysteryAndRollover = async (updates: {
    r5WinnerUsername?: string;
    nextPickWinsR5?: boolean;
    poolPrizeZar: number;
    rolloverAmountZar: number;
    lastPoolWinnerSummary?: string;
    lastWinnerUids?: string[];
  }) => {
    const nextCfg = saveLocalAppConfig({ ...appConfig, ...updates });
    setLocalAppConfig(nextCfg);
    setCloudAppConfig(nextCfg);

    const activeUser = await ensureFirebaseAdminGrant();
    if (activeUser) {
      await updateMysteryAndRolloverConfig(nextCfg, updates);
    }
  };

  const handleTriggerSundayRollover = async () => {
    if (isCloudMode) {
      const res = await evaluateSundayPoolRollover(appConfig, leaderboard);
      if (res.outcome === 'distributed') {
        setConfettiActive(true);
        playVictoryFanfare(muted);
        showToast(`Sunday Reset Complete! ${res.summary}`);
      } else {
        showToast(`🔥 Weekly scores reset — R${res.nextPoolZar} carried forward!`);
      }
      return res;
    }

    const threshold = appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
    const sortedQualified = [...leaderboard]
      .filter((p) => (p.weeklyCoins || 0) >= threshold)
      .sort((a, b) => b.weeklyCoins - a.weeklyCoins);
    const currentPool = Math.max(
      DEFAULT_POOL_PRIZE_ZAR,
      appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR
    );

    if (sortedQualified.length >= 3) {
      const [first, second, third] = sortedQualified;
      const p1 = Math.round(currentPool * 0.5);
      const p2 = Math.round(currentPool * 0.3);
      const p3 = Math.round(currentPool * 0.2);
      const weekKey = getCurrentWeekKey();
      const summary = `1st: ${first.username} (R${p1}) · 2nd: ${second.username} (R${p2}) · 3rd: ${third.username} (R${p3})`;

      const topWinners = [
        { player: first, rank: 1, prizeZar: p1 },
        { player: second, rank: 2, prizeZar: p2 },
        { player: third, rank: 3, prizeZar: p3 },
      ];
      topWinners.forEach(({ player: w, rank, prizeZar }) => {
        setLocalPrizeWins(
          addLocalPrizeWin({
            id: `pw-loc-pool-${Date.now()}-${rank}`,
            uid: w.uid,
            createdByUid: guestPlayer.uid,
            username: w.username,
            prizeType: 'sunday_pool',
            amountZar: prizeZar,
            coinsAwarded: 0,
            rank,
            weekKey,
            summary: `Sunday Pool #${rank} Place — R${prizeZar} (${w.username})`,
            status: 'recorded',
            createdAtMs: Date.now(),
          })
        );
      });

      setLocalAppConfig(
        saveLocalAppConfig({
          ...appConfig,
          poolPrizeZar: DEFAULT_POOL_PRIZE_ZAR,
          rolloverAmountZar: 0,
          poolWeekKey: weekKey,
          weekStartTimestamp: getMondayStartTimestampSAST(),
          lastPoolWinnerSummary: summary,
          lastWinnerUids: [first.uid, second.uid, third.uid],
        })
      );
      setGuestPlayer((prev) => ({ ...prev, weeklyCoins: 0, qualified: false, streakCount: 0 }));
      setConfettiActive(true);
      playVictoryFanfare(muted);
      return {
        outcome: 'distributed' as const,
        summary,
        nextPoolZar: DEFAULT_POOL_PRIZE_ZAR,
        playersReset: leaderboard.length,
      };
    }

    const nextPoolZar = currentPool + DEFAULT_POOL_PRIZE_ZAR;
    const summary = `Unclaimed R${currentPool} rolled over into R${nextPoolZar} pool (${sortedQualified.length}/3 qualified).`;
    setLocalAppConfig(
      saveLocalAppConfig({
        ...appConfig,
        poolPrizeZar: nextPoolZar,
        rolloverAmountZar: currentPool,
        poolWeekKey: getCurrentWeekKey(),
        weekStartTimestamp: getMondayStartTimestampSAST(),
        lastPoolWinnerSummary: '',
        lastWinnerUids: [],
      })
    );
    setGuestPlayer((prev) => ({ ...prev, weeklyCoins: 0, qualified: false, streakCount: 0 }));
    return {
      outcome: 'rolled_over' as const,
      summary,
      nextPoolZar,
      playersReset: leaderboard.length,
    };
  };

  const handleRestoreDefaultEpisodes = async () => {
    await restoreCatalogDefaults();
    showToast('Catalog reset to clean empty state.');
  };

  const handleAdjustPlayerCoins = async (
    player: LeaderboardPlayer,
    newCoins: number,
    newWeeklyCoins: number
  ) => {
    const threshold = appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
    if (isCloudMode) {
      await adminAdjustPlayerCoins(player, newCoins, newWeeklyCoins, threshold);
      return;
    }

    const updated: LeaderboardPlayer = {
      ...player,
      coins: Math.max(0, Math.round(newCoins)),
      weeklyCoins: Math.max(0, Math.round(newWeeklyCoins)),
      qualified: newWeeklyCoins >= threshold,
    };
    const nextLb = upsertLocalLeaderboardPlayer(updated);
    setLocalLeaderboard(nextLb);
    if (updated.uid === guestPlayer.uid) {
      const delta = updated.coins - guestPlayer.coins;
      const res = applyLocalCoinMutation({
        player: { ...updated, coins: guestPlayer.coins },
        privateProfile: guestPrivate,
        walletDelta: delta,
        qualificationThreshold: threshold,
        txMeta:
          delta !== 0
            ? {
                category: 'admin-adjustment',
                title: delta > 0 ? 'Admin Coin Credit' : 'Admin Coin Deduction',
              }
            : undefined,
      });
      setGuestPlayer({ ...res.player, weeklyCoins: updated.weeklyCoins });
      setGuestPrivate(res.privateProfile);
      setLocalTransactions(res.transactions);
    }
  };

  if (isAdminRoute) {
    return (
      <AdminBoardPage
        unlocked={adminUnlocked}
        firebaseUserEmail={firebaseUser?.email || null}
        appConfig={appConfig}
        sections={sections}
        episodes={episodes}
        cloudSeries={cloudSeries}
        players={leaderboard}
        mysteryWinners={mysteryWinners}
        prizeWins={prizeWins}
        onBackToApp={navigateToApp}
        onUnlock={handleUnlockAdmin}
        onConnectFirebaseAdmin={handleConnectFirebaseAdmin}
        onLockAdmin={handleLockAdmin}
        onCreateSection={createSection}
        onRenameSection={renameSection}
        onDeleteSection={deleteSection}
        onUpdateSeriesPoster={updateSeriesPoster}
        onUpdateSponsorUrl={handleUpdateSponsorUrl}
        onUpdateEmbeddedAdHtml={handleUpdateEmbeddedAdHtml}
        onUpdateLiveTicker={handleUpdateLiveTicker}
        onUpdateMysteryAndRollover={handleUpdateMysteryAndRollover}
        onTriggerSundayRollover={handleTriggerSundayRollover}
        onAddEpisode={addEpisode}
        onUpdateEpisode={updateEpisode}
        onDeleteEpisode={deleteEpisode}
        onReorderSeries={reorderSeries}
        onRestoreDefaultEpisodes={handleRestoreDefaultEpisodes}
        onAdjustPlayerCoins={handleAdjustPlayerCoins}
      />
    );
  }

  const pendingGiftBox =
    pendingGiftBoxNumber !== null && sponsorLoading
      ? {
          boxNumber: pendingGiftBoxNumber,
          secondsLeft: sponsorLoading.secondsLeft,
          progress: sponsorLoading.progress,
        }
      : null;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#F6F2E9] pb-24">
      {!splashDone && <VipSplashScreen onComplete={() => setSplashDone(true)} />}

      <ConfettiExplosion
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
      />

      {/* Clear Sponsored Ad Countdown & "Ad Complete! +Coins Earned" Overlay */}
      {sponsorLoading && pendingGiftBoxNumber === null && (() => {
        const isComplete = sponsorLoading.completed;
        const ringSize = 84;
        const strokeWidth = 5;
        const radius = (ringSize - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const activePct = isComplete ? 100 : sponsorLoading.progress;
        const dashOffset = circumference * (1 - activePct / 100);

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isComplete ? 'Ad Complete! +Coins Earned' : 'Sponsored Ad Countdown'}
            className="fixed inset-0 z-[2147483600] bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 overflow-y-auto"
          >
            <div className="w-full max-w-lg mx-auto rounded-2xl border border-[#D4AF37]/45 bg-[#12100B]/95 shadow-[0_10px_40px_rgba(0,0,0,0.85)] overflow-hidden shrink-0">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                {isComplete ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs sm:text-sm font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ad Complete! +Coins Earned</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#FCE7A2]">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>
                      Sponsored Ad • Reward in{' '}
                      <span className="font-mono-num text-amber-300">
                        {sponsorLoading.secondsLeft}s
                      </span>
                      ...
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!isComplete}
                  aria-disabled={!isComplete}
                  onClick={() => {
                    if (!isComplete) return;
                    if (sponsorFlowRef.current.pushedHistory) {
                      sponsorFlowRef.current.pushedHistory = false;
                      try {
                        window.history.back();
                      } catch {
                        // Ignore history back errors
                      }
                    }
                    setSponsorLoading(null);
                    setResumePlaybackSignal((prev) => prev + 1);
                  }}
                  aria-label={
                    isComplete
                      ? 'Close ad overlay'
                      : `Close locked until countdown reaches 0 (${sponsorLoading.secondsLeft}s)`
                  }
                  className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 transition-all shrink-0 ${
                    isComplete
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 cursor-pointer'
                      : 'border-white/10 bg-white/[0.04] text-zinc-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isComplete ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="h-2.5 w-full bg-black/70 overflow-hidden">
                <div
                  className={`h-full will-change-[width] ${
                    isComplete
                      ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                      : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                  }`}
                  style={{ width: `${activePct}%` }}
                />
              </div>
            </div>

            <div className="my-auto w-full max-w-sm mx-auto rounded-3xl bg-gradient-to-b from-[#17121E] via-[#0F0D14] to-[#09090b] border border-amber-400/45 shadow-[0_0_70px_rgba(245,158,11,0.3)] p-5 text-center space-y-4">
              {isComplete ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/70 text-emerald-300 text-xs font-extrabold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Ad Complete! +Coins Earned</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Your coin reward has been added to your tournament wallet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (sponsorFlowRef.current.pushedHistory) {
                        sponsorFlowRef.current.pushedHistory = false;
                        try {
                          window.history.back();
                        } catch {
                          // Ignore history back errors
                        }
                      }
                      setSponsorLoading(null);
                      setResumePlaybackSignal((prev) => prev + 1);
                    }}
                    className="w-full min-h-[48px] px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 text-zinc-950 font-extrabold text-sm shadow-[0_0_28px_rgba(16,185,129,0.5)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Continue Movie ▶</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Animated 60fps Circular Countdown Ring (20s -> 0s) */}
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="relative w-[84px] h-[84px] flex items-center justify-center">
                      <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox={`0 0 ${ringSize} ${ringSize}`}
                        className="-rotate-90 absolute inset-0"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient id="app-ad-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FEF08A" />
                            <stop offset="50%" stopColor="#FBBF24" />
                            <stop offset="100%" stopColor="#F59E0B" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx={ringSize / 2}
                          cy={ringSize / 2}
                          r={radius}
                          fill="rgba(0,0,0,0.55)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth={strokeWidth}
                        />
                        <circle
                          cx={ringSize / 2}
                          cy={ringSize / 2}
                          r={radius}
                          fill="none"
                          stroke="url(#app-ad-ring-grad)"
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                        />
                      </svg>
                      <div className="relative flex flex-col items-center">
                        <span className="font-mono-num text-2xl font-black text-amber-300 leading-none">
                          {sponsorLoading.secondsLeft}s
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
                          Stay Active
                        </span>
                      </div>
                    </div>

                    {/* Pulsing Anti-Freeze Badge Around Live Ad Container */}
                    <div className="w-full rounded-2xl border border-amber-400/50 bg-[#0A0A0F] p-2.5 space-y-2 shadow-[0_0_24px_rgba(251,191,36,0.18)] animate-pulse">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-[11px] font-extrabold text-amber-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span>Ad Playing • Stay 20s for Bonus Coins</span>
                      </div>
                      <div className="rounded-xl overflow-hidden bg-[#09090b] border border-white/10 py-1">
                        <BottomAdBanner />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Sponsored Ad active — wait {sponsorLoading.secondsLeft}s to unlock your coin
                      reward.
                    </p>
                  </div>

                  {(() => {
                    const activeSponsorLink = resolveSponsorLink(appConfig.sponsorAdUrl);
                    return (
                      <a
                        href={activeSponsorLink}
                        target={activeSponsorLink !== '#' ? '_blank' : undefined}
                        rel={activeSponsorLink !== '#' ? 'noopener noreferrer' : undefined}
                        onClick={(e) => {
                          if (activeSponsorLink === '#') {
                            e.preventDefault();
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-200 text-xs font-semibold hover:bg-amber-400/20 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Sponsor Page</span>
                      </a>
                    );
                  })()}

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled
                      className="w-full min-h-[46px] px-4 rounded-2xl bg-white/[0.06] border border-white/10 text-zinc-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Reward unlocks in {sponsorLoading.secondsLeft}s...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelSponsorRewardFlowEarly(false)}
                      className="w-full py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors cursor-pointer"
                    >
                      Exit Ad (No Coins)
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="h-2 shrink-0" aria-hidden="true" />
          </div>
        );
      })()}

      <InAppBrowserBanner />

      <TopHeader
        coins={currentPlayer.coins}
        sundayBonusZar={sundayBonusZar}
        muted={muted}
        onOpenGiftVault={handleOpenGiftVaultFromHeader}
        onToggleMute={handleToggleMute}
        onOpenAdmin={navigateToAdmin}
      />

      {/* Bright Animated Floating Coin Earned Toast / Daily Streak Reminder / Warning */}
      {toast && (
        <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[2147483640] px-4 w-full max-w-md pointer-events-none">
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-2xl px-4 py-3 border flex items-center justify-between gap-2.5 transition-all duration-300 ${
              toast.tone === 'error'
                ? 'bg-red-950/95 border-red-500/80 text-red-100 shadow-2xl shadow-red-950/60'
                : toast.tone === 'reminder'
                  ? 'bg-[#121218]/95 backdrop-blur-md border-[#D4AF37]/45 text-[#F6F2E9] shadow-2xl shadow-black/70'
                  : toast.tone === 'neutral'
                    ? 'bg-[#14141A]/95 border-white/15 text-[#F6F2E9] shadow-2xl'
                    : 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 border-yellow-100 text-zinc-950 shadow-[0_10px_36px_rgba(251,191,36,0.7)] ring-2 ring-amber-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.coinsAwarded && (
                <div className="animate-bounce shrink-0">
                  <RealisticGoldCoin sizePx={42} emblem="$" />
                </div>
              )}
              {toast.tone === 'error' && (
                <AlertTriangle className="w-4 h-4 text-red-300 shrink-0" />
              )}
              {toast.tone === 'reminder' && (
                <Flame className="w-4 h-4 text-[#D4AF37] shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-extrabold leading-snug tracking-tight">
                {toast.message}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {toast.coinsAwarded && (
                <span className="font-mono-num text-xs font-black bg-zinc-950 text-amber-300 px-2.5 py-1 rounded-full shadow">
                  +{toast.coinsAwarded}
                </span>
              )}
              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                  className="relative z-20 pointer-events-auto cursor-pointer min-h-[32px] px-3 rounded-lg gold-gradient-bg text-[#181307] text-xs font-bold whitespace-nowrap hover:brightness-105"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (toastTimerRef.current !== null) {
                    window.clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = null;
                  }
                  setToast(null);
                }}
                aria-label="Dismiss notification"
                className={`relative z-20 pointer-events-auto cursor-pointer min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center transition-colors ${
                  toast.tone === 'gold' || !toast.tone
                    ? 'text-zinc-900/70 hover:text-zinc-950 hover:bg-black/10'
                    : 'text-[#A69F91] hover:text-[#F6F2E9] hover:bg-white/[0.1]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content — Clean 4-Tab Architecture */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-6">
        {activeTab === 'watch' && (
          <WatchTab
            sections={sections}
            episodes={episodes}
            cloudSeries={cloudSeries}
            privateState={privateProfile}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            playerWeeklyCoins={currentPlayer.weeklyCoins}
            playerTotalCoins={currentPlayer.coins}
            qualificationThreshold={qualificationThreshold}
            muted={muted}
            resumePlaybackSignal={resumePlaybackSignal}
            onToggleMute={handleToggleMute}
            onAwardCoinPot={handleAwardCoinPot}
            onStartSponsorReward={startSponsorRewardFlow}
            onClaimHeroBonus={handleClaimHeroBonus}
            onMarkEpisodeWatched={handleMarkEpisodeWatched}
          />
        )}

        {activeTab === 'foryou' && (
          <ForYouTab
            episodes={episodes}
            privateState={privateProfile}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            myListSeriesIds={myListSeriesIds}
            playerWeeklyCoins={currentPlayer.weeklyCoins}
            playerTotalCoins={currentPlayer.coins}
            qualificationThreshold={qualificationThreshold}
            muted={muted}
            resumePlaybackSignal={resumePlaybackSignal}
            onToggleMute={handleToggleMute}
            onToggleMyList={handleToggleMyList}
            onShareEpisode={handleShareEpisode}
            onAwardCoinPot={handleAwardCoinPot}
            onStartSponsorReward={startSponsorRewardFlow}
            onMarkEpisodeWatched={handleMarkEpisodeWatched}
            onSwitchToHome={() => setActiveTab('watch')}
          />
        )}

        {activeTab === 'vault' && (
          <CheckInVaultTab
            privateState={privateProfile}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            openedBoxesOverride={isCloudMode ? cloudOpenedBoxes : undefined}
            mysteryReveal={mysteryReveal}
            pendingGiftBox={pendingGiftBox}
            voucherModal={mysteryVoucherModal}
            players={leaderboard}
            currentUserId={currentPlayer.uid}
            poolPrizeZar={appConfig.poolPrizeZar}
            rolloverAmountZar={appConfig.rolloverAmountZar || 0}
            lastPoolWinnerSummary={appConfig.lastPoolWinnerSummary || ''}
            qualifiedCount={qualifiedCount}
            qualificationThreshold={qualificationThreshold}
            streakActivityDates={privateProfile.streakActivityDates || []}
            transactions={transactions}
            onSundayZeroTick={handleSundayZeroTick}
            onCompleteCheckIn={handleCompleteDailyCheckIn}
            onStartSponsorReward={startSponsorRewardFlow}
            onOpenMysteryBox={handleOpenMysteryBox}
            onDismissVoucherModal={() => setMysteryVoucherModal(null)}
          />
        )}

        {activeTab === 'me' && (
          <MeTab
            player={currentPlayer}
            privateState={privateProfile}
            episodes={episodes}
            myListSeriesIds={myListSeriesIds}
            qualificationThreshold={qualificationThreshold}
            poolPrizeZar={appConfig.poolPrizeZar}
            onUpdatePlayerName={handleUpdatePlayerName}
            onResetMyCoins={handleResetMyCoins}
            onToggleMyList={handleToggleMyList}
            onGoToHome={() => setActiveTab('watch')}
          />
        )}

        {/* Quiet Footer */}
        <footer className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8D867A]">
          <span className="inline-flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
            <strong className="text-[#E8C96D]">{BRAND_NAME}</strong>
            <span>· Instant Play ({currentPlayer.username})</span>
          </span>
          <span className="font-mono-num text-[11px] text-[#7A746A]">
            Progress saved automatically
          </span>
        </footer>
      </main>

      {/* Floating DramaWin VIP Support AI Chat Widget */}
      <SupportChatWidget
        username={currentPlayer.username}
        contact={privateProfile.contact}
        coins={currentPlayer.coins}
        weeklyCoins={currentPlayer.weeklyCoins}
        qualificationThreshold={qualificationThreshold}
        poolPrizeZar={appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR}
        firebaseEmail={firebaseUser?.email || null}
      />

      {/* Fixed 4-Tab Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Exclusive Gift Box Vault Modal (Header Gift Box icon opens ONLY this, never Daily Sign-In) */}
      {giftVaultModalOpen && (
        <div
          className="fixed inset-0 z-[65] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Secret Mystery Gift Vault"
          onClick={handleDismissGiftVaultModal}
        >
          <div
            className="relative w-full max-w-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleDismissGiftVaultModal}
              aria-label="Close Gift Box Vault"
              className="absolute -top-3 -right-2 z-20 min-h-[44px] min-w-[44px] rounded-full bg-[#18181f] border border-white/20 text-white hover:bg-zinc-800 flex items-center justify-center shadow-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <MysteryVaultCard
              highlightVault
              todayKey={getTodayDateKey()}
              privateState={privateProfile}
              openedBoxesOverride={isCloudMode ? cloudOpenedBoxes : undefined}
              mysteryReveal={mysteryReveal}
              pendingGiftBox={pendingGiftBox}
              voucherModal={mysteryVoucherModal}
              onOpenMysteryBox={handleOpenMysteryBox}
              onDismissVoucherModal={() => setMysteryVoucherModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CatalogProvider>
        <DramaWinApp />
      </CatalogProvider>
    </ErrorBoundary>
  );
}
