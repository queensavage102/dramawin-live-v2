import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithPopup } from 'firebase/auth';
import { AlertTriangle, Crown, Flame, ShieldCheck, X } from 'lucide-react';
import { AdminBoardPage } from './components/AdminBoardPage';
import { BoostTab } from './components/BoostTab';
import { BottomNavBar } from './components/BottomNavBar';
import { CheckInVaultTab } from './components/CheckInVaultTab';
import { ConfettiExplosion } from './components/ConfettiExplosion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeaturedPartnerOfferModal } from './components/FeaturedPartnerOfferModal';
import { ForYouTab } from './components/ForYouTab';
import { InAppBrowserBanner } from './components/InAppBrowserBanner';
import { LuckySpinWheelModal, type SpinSliceSpec } from './components/LuckySpinWheelModal';
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
  REFERRAL_REWARD_COINS,
  STREAK_DAYS,
  buildPersonalInviteLink,
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
  awardBoostCoins,
  awardHeroBonusCoins,
  awardMysteryBoxCoins,
  awardSpinWheelCoins,
  awardWatchPotCoins,
  claimStreakDay,
  ensureAdminSeededData,
  evaluateSundayPoolRollover,
  fetchPlayerProfile,
  markEpisodeAsWatched,
  markReferralClaimed,
  mergeWatchedEpisodeId,
  purgeLegacyAndStrayEpisodesFromFirestore,
  recordVerifiedReferralVisit,
  subscribeAppConfig,
  subscribeLeaderboard,
  subscribeMysteryWinners,
  subscribePlayerPrivate,
  subscribePrizeWins,
  subscribeReferralsForUser,
  subscribeTransactions,
  syncPlayerTrackingId,
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
  BOOST_DAILY_GAME_COIN_CAP,
  BOOST_FREE_GAME_PLAYS_PER_DAY,
  BoostTrackerState,
  DailySpinState,
  MAX_EXTRA_SPINS_PER_DAY,
  addLocalPrizeWin,
  applyLocalCoinMutation,
  claimLocalMysteryBox,
  getOrCreateGuestSession,
  getOrCreatePlayerTrackingId,
  loadBoostTrackerState,
  loadDailySpinState,
  loadLocalAppConfig,
  loadLocalLeaderboard,
  loadLocalMysteryWinners,
  loadLocalPrizeWins,
  loadLocalTransactions,
  loadMyListSeriesIds,
  mergeLeaderboardWithSeedPlayers,
  saveBoostTrackerState,
  saveDailySpinState,
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
const REFERRED_BY_STORAGE_KEY = 'dramawin_referred_by_v1';

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

function extractReferralIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const paramRef = (url.searchParams.get('ref') || url.searchParams.get('invite') || '').trim();
    if (/^[a-zA-Z0-9_\-]{3,128}$/.test(paramRef)) {
      return paramRef;
    }

    const cleanPath = url.pathname.replace(/^\/+|\/+$/g, '');
    if (
      cleanPath &&
      cleanPath !== 'admin' &&
      !cleanPath.includes('.') &&
      /^[a-zA-Z0-9_\-]{6,128}$/.test(cleanPath)
    ) {
      return cleanPath;
    }
  } catch {
    // Ignore malformed URLs
  }
  return null;
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
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [referralsJoinedCount, setReferralsJoinedCount] = useState(0);
  const [myListSeriesIds, setMyListSeriesIds] = useState<string[]>(() => loadMyListSeriesIds());
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [cloudOpenedBoxes, setCloudOpenedBoxes] = useState<number[]>([]);
  const [mysteryReveal, setMysteryReveal] = useState<MysteryRevealState | null>(null);
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
  const [sponsorOffer, setSponsorOffer] = useState<{
    claimLabel: string;
    readyHeadline?: string;
    rewardAction?: () => Promise<void>;
    onCancel?: () => void;
  } | null>(null);
  const [resumePlaybackSignal, setResumePlaybackSignal] = useState(0);

  const streakReminderShownRef = useRef<string | null>(null);
  const purgedStrayFirestoreRef = useRef<boolean>(false);
  const triedAnonAuthRef = useRef<boolean>(false);
  const cloudOpenedBoxesRef = useRef<number[]>(cloudOpenedBoxes);
  const toastTimerRef = useRef<number | null>(null);
  const capturedReferrerRef = useRef<string | null>(extractReferralIdFromLocation());
  const recordedIncomingRefSentRef = useRef<boolean>(false);
  const claimingReferralIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    cloudOpenedBoxesRef.current = cloudOpenedBoxes;
  }, [cloudOpenedBoxes]);

  useEffect(() => {
    if (!mysteryReveal) return;
    if (mysteryReveal.kind === 'oops' || (mysteryReveal.coins ?? 0) === 0) {
      const timer = window.setTimeout(() => {
        setMysteryReveal((curr) =>
          curr &&
          curr.boxNumber === mysteryReveal.boxNumber &&
          curr.dateKey === mysteryReveal.dateKey
            ? null
            : curr
        );
      }, 3000);
      return () => window.clearTimeout(timer);
    }
  }, [mysteryReveal]);

  const startSponsorRewardFlow = useCallback(
    (
      rewardAction?: () => Promise<void>,
      options?: {
        claimLabel?: string;
        readyHeadline?: string;
        onCancel?: () => void;
      }
    ) => {
      setSponsorOffer({
        claimLabel: options?.claimLabel || 'Claim Reward',
        readyHeadline: options?.readyHeadline,
        rewardAction,
        onCancel: options?.onCancel,
      });
    },
    []
  );

  // Use cloud session only if user is signed into Firebase Auth AND has a cloud profile;
  // otherwise run 100% seamlessly in instant localStorage mode with zero auth wall.
  const isCloudMode = Boolean(firebaseUser && cloudPrivateProfile);

  const guestTrackingId = useMemo(() => getOrCreatePlayerTrackingId(), []);
  const playerTrackingId =
    firebaseUser && !firebaseUser.isAnonymous ? firebaseUser.uid : guestTrackingId;

  const currentPlayer: LeaderboardPlayer = useMemo(() => {
    if (isCloudMode && firebaseUser) {
      return (
        cloudLeaderboard.find((p) => p.uid === firebaseUser.uid) || {
          uid: firebaseUser.uid,
          trackingId: playerTrackingId,
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
  }, [isCloudMode, firebaseUser, cloudLeaderboard, cloudPrivateProfile, guestPlayer, playerTrackingId]);

  const privateProfile: PlayerPrivate = useMemo(
    () => (isCloudMode && cloudPrivateProfile ? cloudPrivateProfile : guestPrivate),
    [isCloudMode, cloudPrivateProfile, guestPrivate]
  );

  const syncedTrackingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isCloudMode || !firebaseUser || firebaseUser.isAnonymous) return;
    const needPublicSync = currentPlayer.trackingId !== playerTrackingId;
    const needPrivateSync = privateProfile.trackingId !== playerTrackingId;
    if (!needPublicSync && !needPrivateSync) return;

    const attemptKey = `${firebaseUser.uid}:${playerTrackingId}:${needPublicSync ? 1 : 0}${needPrivateSync ? 1 : 0}`;
    if (syncedTrackingRef.current === attemptKey) return;
    syncedTrackingRef.current = attemptKey;

    void syncPlayerTrackingId(firebaseUser.uid, playerTrackingId, {
      syncPublic: needPublicSync,
      syncPrivate: needPrivateSync,
    }).catch(() => {
      // Keep non-blocking if offline or rules reject
    });
  }, [
    isCloudMode,
    firebaseUser,
    currentPlayer.trackingId,
    privateProfile.trackingId,
    playerTrackingId,
  ]);

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

  const resolveGiftBoxOutcome = useCallback(
    (boxNumber: number) => {
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
        const isWinningBox = boxNumber === 11;
        const cycleCompleted = nextOpenedRaw.length >= MYSTERY_CYCLE_BOXES;
        // Auto-reset back to Box #1 once all 12 mystery boxes are opened
        const persistedOpened = cycleCompleted ? [] : nextOpenedRaw;
        cloudOpenedBoxesRef.current = persistedOpened;
        setCloudOpenedBoxes(persistedOpened);
        writeCloudOpenedBoxes(activeUser.uid, todayKey, persistedOpened);

        const threshold = latestCfg.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

        if (isWinningBox) {
          setMysteryReveal({
            dateKey: todayKey,
            boxNumber,
            kind: 'jackpot',
            coins: 1000,
            cycleReset: cycleCompleted,
          });
          setConfettiActive(true);
          playCoinPotCashChime(isMutedNow);
          playVictoryFanfare(isMutedNow);
          showToast(
            cycleCompleted
              ? '🎉 Jackpot! You found the hidden +1,000 Coins gift! Grid reset to Box #1.'
              : '🎉 Jackpot! You found the hidden +1,000 Coins gift!',
            1000
          );
          void awardMysteryBoxCoins(
            player,
            priv,
            boxNumber,
            1000,
            threshold,
            true
          ).catch(() => {});
        } else {
          setMysteryReveal({
            dateKey: todayKey,
            boxNumber,
            kind: 'oops',
            coins: 0,
            cycleReset: cycleCompleted,
          });
          showToast(
            cycleCompleted
              ? `Oops, sorry! Try the next box 🥲 (${MYSTERY_CYCLE_BOXES}/${MYSTERY_CYCLE_BOXES} opened — grid reset to Box #1)`
              : `Oops, sorry! Try the next box 🥲 (Box #${boxNumber} Claimed · ${persistedOpened.length}/${MYSTERY_CYCLE_BOXES})`,
            undefined,
            'reminder',
            undefined,
            3000
          );
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
          cycleReset: result.cycleReset,
        };
        setMysteryReveal(revealPayload);

        if (result.outcome.kind === 'jackpot') {
          setConfettiActive(true);
          playCoinPotCashChime(isMutedNow);
          playVictoryFanfare(isMutedNow);
          showToast(
            result.cycleReset
              ? '🎉 Jackpot! You found the hidden +1,000 Coins gift! Grid reset to Box #1.'
              : '🎉 Jackpot! You found the hidden +1,000 Coins gift!',
            1000
          );
        } else {
          const openedNow = (result.privateProfile.openedMysteryBoxesToday || []).length;
          showToast(
            result.cycleReset
              ? `Oops, sorry! Try the next box 🥲 (${MYSTERY_CYCLE_BOXES}/${MYSTERY_CYCLE_BOXES} opened — grid reset to Box #1)`
              : `Oops, sorry! Try the next box 🥲 (Box #${boxNumber} Claimed · ${openedNow}/${MYSTERY_CYCLE_BOXES})`,
            undefined,
            'reminder',
            undefined,
            3000
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

  // Mystery Box Flow: opens the dark-and-gold Featured Partner Offer modal (20s away timer) before resolving Box #11 (+1,000 Coins Jackpot) or #1-#10 / #12 (0 Coins Oops) and auto-resetting after all 12 boxes
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

    startSponsorRewardFlow(
      async () => {
        resolveGiftBoxOutcome(boxNumber);
      },
      {
        claimLabel: `Unlock Box #${boxNumber}`,
        readyHeadline: `Mystery Box #${boxNumber} • Ready to Open!`,
      }
    );
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

  const handleNotifyInviteLinkCopied = useCallback(
    (_url: string) => {
      showToast(
        `Personal invite link copied! +${REFERRAL_REWARD_COINS.toLocaleString()} Coins credit when a friend visits via your link.`,
        undefined,
        'gold',
        undefined,
        3500
      );
    },
    [showToast]
  );

  const handleNotifyWhatsappShared = useCallback(() => {
    showToast(
      `Opened WhatsApp! +${REFERRAL_REWARD_COINS.toLocaleString()} Coins credit automatically when a friend joins via your link.`,
      undefined,
      'neutral',
      undefined,
      3500
    );
  }, [showToast]);

  const handleOpenInviteSocial = useCallback(() => {
    setActiveTab('me');
    window.setTimeout(() => {
      document.getElementById('invite-social-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 90);
  }, []);

  const [spinState, setSpinState] = useState<DailySpinState>(() =>
    loadDailySpinState(guestPlayer.uid)
  );
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const hasAutoShownSpinAfterIntroRef = useRef(false);

  useEffect(() => {
    setSpinState(loadDailySpinState(currentPlayer.uid));
  }, [currentPlayer.uid]);

  const [boostState, setBoostState] = useState<BoostTrackerState>(() =>
    loadBoostTrackerState(guestPlayer.uid)
  );

  useEffect(() => {
    setBoostState(loadBoostTrackerState(currentPlayer.uid));
  }, [currentPlayer.uid]);

  const grantBoostCoins = useCallback(
    async (rewardCoins: number, title: string, customToastMessage?: string): Promise<void> => {
      const {
        isCloudMode: cloudNow,
        currentPlayer: playerNow,
        privateProfile: privNow,
        appConfig: cfgNow,
        muted: mutedNow,
      } = latestStateRef.current;

      const safeCoins = Math.max(1, Math.min(2000, Math.round(rewardCoins)));
      const threshold = cfgNow.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

      if (cloudNow) {
        await awardBoostCoins(playerNow, privNow, safeCoins, threshold, title);
      } else {
        const res = applyLocalCoinMutation({
          player: playerNow,
          privateProfile: privNow,
          walletDelta: safeCoins,
          qualificationThreshold: threshold,
          recordStreakActivity: true,
          txMeta: {
            category: 'boost',
            title: title.slice(0, 100),
          },
        });
        setGuestPlayer(res.player);
        setGuestPrivate(res.privateProfile);
        setLocalTransactions(res.transactions);
        setLocalLeaderboard(loadLocalLeaderboard(res.player));
      }

      if (safeCoins >= 1000) {
        setConfettiActive(true);
        playVictoryFanfare(mutedNow);
      } else {
        playCoinChime(mutedNow);
      }
      showToast(
        customToastMessage || `+${safeCoins.toLocaleString()} Coins Added to Wallet!`,
        safeCoins,
        'gold',
        undefined,
        3500
      );
    },
    [showToast]
  );

  const handleClaimAdBoost = useCallback(
    async (kind: 'speed' | 'mega', rewardCoins: number, title: string): Promise<void> => {
      const uid = latestStateRef.current.currentPlayer.uid;
      const todayKey = getTodayDateKey();
      const latest = loadBoostTrackerState(uid, todayKey);
      const now = Date.now();

      if (kind === 'speed' && latest.speedBoostLastClaimAt > 0 && now - latest.speedBoostLastClaimAt < 60 * 60 * 1000) {
        showToast('2x Watch Speed Boost is still on cooldown.', undefined, 'neutral', undefined, 2600);
        return;
      }
      if (kind === 'mega' && latest.dailyMegaLastClaimAt > 0 && now - latest.dailyMegaLastClaimAt < 24 * 60 * 60 * 1000) {
        showToast('Daily Mega Boost is already claimed for now.', undefined, 'neutral', undefined, 2600);
        return;
      }

      await grantBoostCoins(rewardCoins, title);

      const refreshed = loadBoostTrackerState(uid, todayKey);
      const nextState: BoostTrackerState =
        kind === 'speed'
          ? { ...refreshed, speedBoostLastClaimAt: now }
          : { ...refreshed, dailyMegaLastClaimAt: now };
      setBoostState(saveBoostTrackerState(uid, nextState));
    },
    [grantBoostCoins, showToast]
  );

  const handleAdvanceMarathonAd = useCallback(() => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    const now = Date.now();

    if (latest.marathonLastClaimAt > 0 && now - latest.marathonLastClaimAt < 24 * 60 * 60 * 1000) {
      showToast('5-Ad Marathon Streak resets every 24 hours.', undefined, 'neutral', undefined, 2600);
      return;
    }

    const nextCount = Math.min(5, latest.marathonAdsWatched + 1);
    setBoostState(
      saveBoostTrackerState(uid, {
        ...latest,
        marathonAdsWatched: nextCount,
      })
    );
    playCoinChime(latestStateRef.current.muted);
    showToast(
      nextCount >= 5
        ? '5 / 5 Sponsor Ads Verified! Tap Claim +2,000 Coins!'
        : `Sponsor Ad Verified (${nextCount} / 5 Complete)`,
      undefined,
      'gold',
      undefined,
      3000
    );
  }, [showToast]);

  const handleClaimMarathonReward = useCallback(async (): Promise<void> => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    const now = Date.now();

    if (latest.marathonLastClaimAt > 0 && now - latest.marathonLastClaimAt < 24 * 60 * 60 * 1000) {
      showToast('5-Ad Marathon Streak already claimed today.', undefined, 'neutral', undefined, 2600);
      return;
    }
    if (latest.marathonAdsWatched < 5) {
      showToast('Complete all 5 / 5 sponsor views first!', undefined, 'neutral', undefined, 2600);
      return;
    }

    await grantBoostCoins(2000, '🎬 5-Ad Marathon Streak (+2,000 Coins)');

    const refreshed = loadBoostTrackerState(uid, todayKey);
    setBoostState(
      saveBoostTrackerState(uid, {
        ...refreshed,
        marathonAdsWatched: 0,
        marathonLastClaimAt: now,
      })
    );
  }, [grantBoostCoins, showToast]);

  const handleConsumeGamePlay = useCallback((): boolean => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    const totalPlays = BOOST_FREE_GAME_PLAYS_PER_DAY + latest.dailyGameExtraPlaysUnlocked;
    if (latest.dailyGamePlaysUsed >= totalPlays) {
      showToast('No plays remaining — visit sponsor to unlock an extra play!', undefined, 'neutral', undefined, 2800);
      return false;
    }

    const updated = saveBoostTrackerState(uid, {
      ...latest,
      dailyGameDate: todayKey,
      dailyGamePlaysUsed: latest.dailyGamePlaysUsed + 1,
      dailyGameDoubleBonusNext: false,
    });
    setBoostState(updated);
    return true;
  }, [showToast]);

  const handleUnlockSponsorGamePlay = useCallback(() => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    const updated = saveBoostTrackerState(uid, {
      ...latest,
      dailyGameDate: todayKey,
      dailyGameExtraPlaysUnlocked: latest.dailyGameExtraPlaysUnlocked + 1,
      dailyGameDoubleBonusNext: true,
    });
    setBoostState(updated);
    playCoinChime(latestStateRef.current.muted);
    showToast(
      'Extra Mini-Game Play Unlocked with 2x Bonus!',
      undefined,
      'gold',
      undefined,
      3000
    );
  }, [showToast]);

  const handleClaimMiniGameWin = useCallback(
    async (game: 'trivia' | 'memory', baseCoins: number): Promise<number> => {
      const uid = latestStateRef.current.currentPlayer.uid;
      const todayKey = getTodayDateKey();
      const latest = loadBoostTrackerState(uid, todayKey);
      const remainingAllowance = Math.max(0, BOOST_DAILY_GAME_COIN_CAP - latest.dailyGameCoins);
      const awarded = Math.min(Math.max(0, Math.round(baseCoins)), remainingAllowance);

      if (awarded <= 0) {
        showToast(
          'Daily 1,000 game coin limit reached! Come back tomorrow.',
          undefined,
          'neutral',
          undefined,
          3000
        );
        return 0;
      }

      const label =
        game === 'trivia'
          ? `🎭 Drama & Riddle Trivia (+${awarded} Coins)`
          : `🃏 Gold Memory Match (+${awarded} Coins)`;
      await grantBoostCoins(awarded, label);

      const refreshed = loadBoostTrackerState(uid, todayKey);
      setBoostState(
        saveBoostTrackerState(uid, {
          ...refreshed,
          dailyGameDate: todayKey,
          dailyGameCoins: Math.min(BOOST_DAILY_GAME_COIN_CAP, refreshed.dailyGameCoins + awarded),
        })
      );
      return awarded;
    },
    [grantBoostCoins, showToast]
  );

  const handleMarkTiktokVisited = useCallback(() => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const latest = loadBoostTrackerState(uid, getTodayDateKey());
    if (!latest.tiktokVisited) {
      setBoostState(
        saveBoostTrackerState(uid, {
          ...latest,
          tiktokVisited: true,
        })
      );
    }
  }, []);

  const handleClaimTiktokBoost = useCallback(async (): Promise<void> => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    if (latest.tiktokClaimed) {
      showToast('TikTok follow bonus already claimed!', undefined, 'neutral', undefined, 2600);
      return;
    }

    await grantBoostCoins(500, '📲 Follow on TikTok (@faceless_creator_sa)');
    const refreshed = loadBoostTrackerState(uid, todayKey);
    setBoostState(
      saveBoostTrackerState(uid, {
        ...refreshed,
        tiktokVisited: true,
        tiktokClaimed: true,
      })
    );
  }, [grantBoostCoins, showToast]);

  const handleSeriesRequestReward = useCallback(async (): Promise<boolean> => {
    const uid = latestStateRef.current.currentPlayer.uid;
    const todayKey = getTodayDateKey();
    const latest = loadBoostTrackerState(uid, todayKey);
    if (latest.seriesRequestBonusClaimed) {
      showToast(
        'Request sent! Thanks for your suggestion.',
        undefined,
        'gold',
        undefined,
        3200
      );
      return false;
    }

    await grantBoostCoins(
      250,
      '🎬 Series / Movie Request Bonus (+250 Coins)',
      'Request sent! +250 Coins added'
    );
    const refreshed = loadBoostTrackerState(uid, todayKey);
    setBoostState(
      saveBoostTrackerState(uid, {
        ...refreshed,
        seriesRequestBonusClaimed: true,
      })
    );
    return true;
  }, [grantBoostCoins, showToast]);

  const referralUserId = firebaseUser?.uid || currentPlayer.uid;

  const handleClaimPlayerGiftBox = useCallback(async (): Promise<void> => {
    await grantBoostCoins(300, '🎁 Video Player Claim Gift Box (+300 Coins)');
  }, [grantBoostCoins]);

  // Clean referral query/path from browser address bar on entry
  useEffect(() => {
    if (typeof window === 'undefined' || isAdminRoute || !capturedReferrerRef.current) return;
    try {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has('ref') ||
        url.searchParams.has('invite') ||
        (url.pathname && url.pathname !== '/')
      ) {
        window.history.replaceState({}, '', '/');
      }
    } catch {
      // Ignore history API errors
    }
  }, [isAdminRoute]);

  // Record incoming friend referral visit ONLY once per new visitor device/auth UID (never self-referral)
  useEffect(() => {
    if (isAdminRoute || !firebaseUser?.uid || recordedIncomingRefSentRef.current) return;
    const refId = capturedReferrerRef.current;
    if (!refId) return;

    if (refId === firebaseUser.uid || refId === currentPlayer.uid || refId === playerTrackingId) {
      recordedIncomingRefSentRef.current = true;
      return;
    }

    try {
      if (window.localStorage.getItem(REFERRED_BY_STORAGE_KEY)) {
        recordedIncomingRefSentRef.current = true;
        return;
      }
      window.localStorage.setItem(REFERRED_BY_STORAGE_KEY, refId);
    } catch {
      // Ignore storage errors
    }

    recordedIncomingRefSentRef.current = true;
    void recordVerifiedReferralVisit(firebaseUser.uid, refId).then((recorded) => {
      if (recorded) {
        showToast(
          'Welcome to DramaWin! Your friend’s referral invite was verified.',
          undefined,
          'gold',
          undefined,
          3500
        );
      }
    });
  }, [isAdminRoute, firebaseUser?.uid, currentPlayer.uid, playerTrackingId, showToast]);

  // Subscribe to verified friend referrals for the current user and credit pending ones
  useEffect(() => {
    if (isAdminRoute || !firebaseUser?.uid) {
      setReferralsJoinedCount(0);
      return;
    }

    const unsub = subscribeReferralsForUser(
      firebaseUser.uid,
      ({ totalJoined, pendingVisitorIds }) => {
        setReferralsJoinedCount(totalJoined);

        pendingVisitorIds.forEach((visitorId) => {
          if (claimingReferralIdsRef.current.has(visitorId)) return;
          claimingReferralIdsRef.current.add(visitorId);

          void (async () => {
            try {
              const marked = await markReferralClaimed(visitorId);
              if (marked) {
                await grantBoostCoins(
                  REFERRAL_REWARD_COINS,
                  '👥 Verified Friend Referral (+1,000 Coins)'
                );
              }
            } finally {
              claimingReferralIdsRef.current.delete(visitorId);
            }
          })();
        });
      }
    );

    return () => {
      unsub();
    };
  }, [isAdminRoute, firebaseUser?.uid, grantBoostCoins]);

  // Always show Lucky Spin Wheel right after the Intro screen finishes (even if free spin was used)
  useEffect(() => {
    if (isAdminRoute || !splashDone || hasAutoShownSpinAfterIntroRef.current) return;
    hasAutoShownSpinAfterIntroRef.current = true;
    const todayKey = getTodayDateKey();
    const current = loadDailySpinState(currentPlayer.uid, todayKey);
    if (current.popupShownDate !== todayKey) {
      setSpinState(
        saveDailySpinState(currentPlayer.uid, {
          ...current,
          popupShownDate: todayKey,
        })
      );
    }
    setSpinModalOpen(true);
  }, [isAdminRoute, splashDone, currentPlayer.uid]);

  const handleSpinWheelWin = useCallback(
    async (slice: SpinSliceSpec, usedExtraSpin: boolean): Promise<void> => {
      const {
        isCloudMode: cloudNow,
        currentPlayer: playerNow,
        privateProfile: privNow,
        appConfig: cfgNow,
        muted: mutedNow,
      } = latestStateRef.current;

      const todayKey = getTodayDateKey();
      const current = loadDailySpinState(playerNow.uid, todayKey);

      if (slice.kind === 'respin') {
        // Grant +1 free spin immediately (refund current spin / unlock free spin without consuming extra spins)
        const nextSpin = saveDailySpinState(playerNow.uid, {
          ...current,
          popupShownDate: todayKey,
          freeSpinUsed: false,
          extraSpinsUsed: current.extraSpinsUsed,
        });
        setSpinState(nextSpin);
        playCoinChime(mutedNow);
        showToast('🎉 Lucky! You won 1 Free Respin!', undefined, 'gold', undefined, 3200);
        return;
      }

      const nextSpin = saveDailySpinState(playerNow.uid, {
        ...current,
        popupShownDate: todayKey,
        freeSpinUsed: usedExtraSpin ? current.freeSpinUsed : true,
        extraSpinsUsed: usedExtraSpin
          ? Math.min(MAX_EXTRA_SPINS_PER_DAY, current.extraSpinsUsed + 1)
          : current.extraSpinsUsed,
      });
      setSpinState(nextSpin);

      if (slice.kind === 'oops') {
        showToast(
          '😅 Oops! No coins this time—unlock an extra spin below!',
          undefined,
          'neutral',
          undefined,
          3200
        );
        return;
      }

      const safeCoins = Math.max(100, Math.min(1000, Math.round(slice.coins)));
      const threshold = cfgNow.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;

      if (cloudNow) {
        await awardSpinWheelCoins(playerNow, privNow, safeCoins, threshold);
      } else {
        const res = applyLocalCoinMutation({
          player: playerNow,
          privateProfile: privNow,
          walletDelta: safeCoins,
          qualificationThreshold: threshold,
          recordStreakActivity: true,
          txMeta: {
            category: 'spin-wheel',
            title: `Daily Lucky Spin Wheel (+${safeCoins.toLocaleString()} Coins)`,
          },
        });
        setGuestPlayer(res.player);
        setGuestPrivate(res.privateProfile);
        setLocalTransactions(res.transactions);
        setLocalLeaderboard(loadLocalLeaderboard(res.player));
      }

      if (safeCoins >= 500) {
        setConfettiActive(true);
        playVictoryFanfare(mutedNow);
      } else {
        playCoinChime(mutedNow);
      }
      showToast(
        `🎡 Lucky Spin Won +${safeCoins.toLocaleString()} Coins!`,
        safeCoins,
        'gold',
        undefined,
        3500
      );
    },
    [showToast]
  );

  const handleUnlockExtraSpin = useCallback(() => {
    const { currentPlayer: playerNow } = latestStateRef.current;
    const todayKey = getTodayDateKey();
    const current = loadDailySpinState(playerNow.uid, todayKey);
    if (current.extraSpinsUnlocked >= MAX_EXTRA_SPINS_PER_DAY) {
      showToast('All 3 extra partner spins already unlocked today!', undefined, 'neutral', undefined, 2800);
      return;
    }

    setSpinModalOpen(false);
    startSponsorRewardFlow(
      async () => {
        const uid = latestStateRef.current.currentPlayer.uid;
        const latestSpin = loadDailySpinState(uid, getTodayDateKey());
        const updated = saveDailySpinState(uid, {
          ...latestSpin,
          extraSpinsUnlocked: Math.min(
            MAX_EXTRA_SPINS_PER_DAY,
            latestSpin.extraSpinsUnlocked + 1
          ),
        });
        setSpinState(updated);
        setSpinModalOpen(true);
        playCoinChime(latestStateRef.current.muted);
        showToast(
          `🎡 Extra Spin Unlocked! (${updated.extraSpinsUnlocked}/${MAX_EXTRA_SPINS_PER_DAY})`,
          undefined,
          'gold',
          undefined,
          3000
        );
      },
      {
        claimLabel: 'Unlock +1 Spin',
        readyHeadline: 'Sponsor Ad • Extra Lucky Spin Unlocked!',
        onCancel: () => {
          setSpinModalOpen(true);
        },
      }
    );
  }, [showToast, startSponsorRewardFlow]);

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
    (_episode: DramaEpisode) => {
      const shareUrl = buildPersonalInviteLink(referralUserId);
      const copyFallback = () => {
        try {
          const el = document.createElement('textarea');
          el.value = shareUrl;
          el.setAttribute('readonly', '');
          el.className = 'sr-only';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
          showToast('Personal share link copied!', undefined, 'gold', undefined, 2600);
        } catch {
          showToast(`Share link: ${shareUrl}`, undefined, 'neutral', undefined, 2600);
        }
      };

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard
          .writeText(shareUrl)
          .then(() => {
            showToast('Personal share link copied!', undefined, 'gold', undefined, 2600);
          })
          .catch(copyFallback);
      } else {
        copyFallback();
      }
    },
    [referralUserId, showToast]
  );

  const handleSundayZeroTick = useCallback(() => {
    if (!adminUnlocked || leaderboard.length === 0 || !isCloudMode) return;
    void evaluateSundayPoolRollover(appConfig, leaderboard).then((res) => {
      if (res.outcome === 'distributed') {
        setConfettiActive(true);
        playVictoryFanfare(muted);
        showToast(`Sunday Pool Distributed! ${res.summary}`);
      } else {
        const nextCoins = res.nextPoolZar >= 1000 ? res.nextPoolZar : res.nextPoolZar * 1000;
        showToast(`🔥 ROLLOVER POOL: ${nextCoins.toLocaleString()} Coins carried forward!`);
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
        const nextCoins = res.nextPoolZar >= 1000 ? res.nextPoolZar : res.nextPoolZar * 1000;
        showToast(`🔥 Weekly scores reset — ${nextCoins.toLocaleString()} Coins carried forward!`);
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
      const c1 = (p1 >= 1000 ? p1 : p1 * 1000).toLocaleString();
      const c2 = (p2 >= 1000 ? p2 : p2 * 1000).toLocaleString();
      const c3 = (p3 >= 1000 ? p3 : p3 * 1000).toLocaleString();
      const weekKey = getCurrentWeekKey();
      const summary = `1st: ${first.username} (${c1} Coins) · 2nd: ${second.username} (${c2} Coins) · 3rd: ${third.username} (${c3} Coins)`;

      const topWinners = [
        { player: first, rank: 1, prizeZar: p1, coinsDisplay: c1 },
        { player: second, rank: 2, prizeZar: p2, coinsDisplay: c2 },
        { player: third, rank: 3, prizeZar: p3, coinsDisplay: c3 },
      ];
      topWinners.forEach(({ player: w, rank, prizeZar, coinsDisplay }) => {
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
            summary: `Sunday Pool #${rank} Place — ${coinsDisplay} Coins (${w.username})`,
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
    const curCoins = (currentPool >= 1000 ? currentPool : currentPool * 1000).toLocaleString();
    const nxtCoins = (nextPoolZar >= 1000 ? nextPoolZar : nextPoolZar * 1000).toLocaleString();
    const summary = `Unclaimed ${curCoins} Coins rolled over into ${nxtCoins} Coins pool (${sortedQualified.length}/3 qualified).`;
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

  return (
    <div className="min-h-screen bg-[#09090b] text-[#F6F2E9] pb-24">
      {!splashDone && <VipSplashScreen onComplete={() => setSplashDone(true)} />}

      <ConfettiExplosion
        active={confettiActive}
        onComplete={() => setConfettiActive(false)}
      />

      {/* Unified Dark-and-Gold 20s Pause-on-Return Featured Partner Offer Modal */}
      <FeaturedPartnerOfferModal
        open={Boolean(sponsorOffer)}
        sponsorUrl={appConfig.sponsorAdUrl}
        claimLabel={sponsorOffer?.claimLabel || 'Claim Reward'}
        readyHeadline={sponsorOffer?.readyHeadline}
        onClaim={async () => {
          const action = sponsorOffer?.rewardAction;
          setSponsorOffer(null);
          setResumePlaybackSignal((prev) => prev + 1);
          if (action) {
            await action();
          }
        }}
        onCancel={() => {
          const cancelCb = sponsorOffer?.onCancel;
          setSponsorOffer(null);
          setResumePlaybackSignal((prev) => prev + 1);
          cancelCb?.();
        }}
      />

      {/* Daily Lucky Spin Wheel Modal */}
      <LuckySpinWheelModal
        open={spinModalOpen && !sponsorOffer}
        spinState={spinState}
        onSpinWin={handleSpinWheelWin}
        onUnlockExtraSpin={handleUnlockExtraSpin}
        onClose={() => setSpinModalOpen(false)}
      />

      <InAppBrowserBanner />

      <TopHeader
        coins={currentPlayer.coins}
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
            isAdmin={Boolean(
              adminUnlocked ||
                (firebaseUser?.email &&
                  firebaseUser.email.toLowerCase() === 'gerinaicker04@gmail.com')
            )}
            referralUserId={referralUserId}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            playerWeeklyCoins={currentPlayer.weeklyCoins}
            playerTotalCoins={currentPlayer.coins}
            qualificationThreshold={qualificationThreshold}
            muted={muted}
            resumePlaybackSignal={resumePlaybackSignal}
            onToggleMute={handleToggleMute}
            onAwardCoinPot={handleAwardCoinPot}
            onClaimGiftBoxCoins={handleClaimPlayerGiftBox}
            onShareEpisode={handleShareEpisode}
            onStartSponsorReward={startSponsorRewardFlow}
            onClaimHeroBonus={handleClaimHeroBonus}
            onMarkEpisodeWatched={handleMarkEpisodeWatched}
          />
        )}

        {activeTab === 'foryou' && (
          <ForYouTab
            episodes={episodes}
            privateState={privateProfile}
            referralUserId={referralUserId}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            playerWeeklyCoins={currentPlayer.weeklyCoins}
            playerTotalCoins={currentPlayer.coins}
            qualificationThreshold={qualificationThreshold}
            muted={muted}
            resumePlaybackSignal={resumePlaybackSignal}
            onToggleMute={handleToggleMute}
            onShareEpisode={handleShareEpisode}
            onAwardCoinPot={handleAwardCoinPot}
            onClaimGiftBoxCoins={handleClaimPlayerGiftBox}
            onStartSponsorReward={startSponsorRewardFlow}
            onMarkEpisodeWatched={handleMarkEpisodeWatched}
            onSwitchToHome={() => setActiveTab('watch')}
          />
        )}

        {activeTab === 'boost' && (
          <BoostTab
            coins={currentPlayer.coins}
            weeklyCoins={currentPlayer.weeklyCoins}
            qualificationThreshold={qualificationThreshold}
            todayKey={getTodayDateKey()}
            boostState={boostState}
            onClaimAdBoost={handleClaimAdBoost}
            onAdvanceMarathonAd={handleAdvanceMarathonAd}
            onClaimMarathonReward={handleClaimMarathonReward}
            onConsumeGamePlay={handleConsumeGamePlay}
            onUnlockSponsorGamePlay={handleUnlockSponsorGamePlay}
            onClaimMiniGameWin={handleClaimMiniGameWin}
          />
        )}

        {activeTab === 'vault' && (
          <CheckInVaultTab
            privateState={privateProfile}
            sponsorAdUrl={appConfig.sponsorAdUrl}
            openedBoxesOverride={isCloudMode ? cloudOpenedBoxes : undefined}
            mysteryReveal={mysteryReveal}
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
            onOpenInviteSocial={handleOpenInviteSocial}
          />
        )}

        {activeTab === 'me' && (
          <MeTab
            player={currentPlayer}
            privateState={privateProfile}
            trackingId={playerTrackingId}
            referralUserId={referralUserId}
            referralsJoinedCount={referralsJoinedCount}
            boostState={boostState}
            episodes={episodes}
            myListSeriesIds={myListSeriesIds}
            qualificationThreshold={qualificationThreshold}
            poolPrizeZar={appConfig.poolPrizeZar}
            onUpdatePlayerName={handleUpdatePlayerName}
            onToggleMyList={handleToggleMyList}
            onGoToHome={() => setActiveTab('watch')}
            onNotifyInviteLinkCopied={handleNotifyInviteLinkCopied}
            onNotifyWhatsappShared={handleNotifyWhatsappShared}
            onMarkTiktokVisited={handleMarkTiktokVisited}
            onClaimTiktokBoost={handleClaimTiktokBoost}
            onSeriesRequestReward={handleSeriesRequestReward}
          />
        )}

        {/* Compliance Footer */}
        <footer className="pt-4 pb-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-[#8D867A]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
              <strong className="text-[#E8C96D]">{BRAND_NAME}</strong>
              <span>· Instant Play</span>
            </span>
            <span className="text-white/20">•</span>
            <span className="text-[11px] text-[#9E978B]">
              Show metadata provided by TVMaze &amp; Jikan
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLegalModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E8C96D] hover:text-[#F6D778] underline underline-offset-4 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Privacy Policy &amp; Affiliate Disclosure
            </button>
          </div>
        </footer>
      </main>

      {/* Existing Floating Yellow Support Button & VIP Support Chat Modal (Gmail/Web3Forms forwarding intact) */}
      <SupportChatWidget
        username={currentPlayer.username}
        contact={privateProfile.contact}
        coins={currentPlayer.coins}
        weeklyCoins={currentPlayer.weeklyCoins}
        qualificationThreshold={qualificationThreshold}
        poolPrizeZar={appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR}
        firebaseEmail={firebaseUser?.email || null}
      />

      {/* Fixed 5-Tab Bottom Navigation Bar */}
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
              voucherModal={mysteryVoucherModal}
              onOpenMysteryBox={handleOpenMysteryBox}
              onDismissVoucherModal={() => setMysteryVoucherModal(null)}
            />
          </div>
        </div>
      )}

      {/* Privacy Policy & Affiliate Disclosure Modal */}
      {legalModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Privacy Policy and Affiliate Disclosure"
          onClick={() => setLegalModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg my-auto rounded-2xl bg-[#121218] border border-[#D4AF37]/30 p-5 sm:p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Privacy Policy &amp; Affiliate Disclosure
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalOpen(false)}
                aria-label="Close Privacy Policy and Affiliate Disclosure"
                className="min-h-[38px] min-w-[38px] rounded-full bg-white/5 border border-white/15 text-zinc-200 hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm text-[#C8C0B2] leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
              <section className="space-y-1.5">
                <h3 className="font-semibold text-[#E8C96D]">1. Affiliate &amp; Partner Disclosure</h3>
                <p>
                  Some external &ldquo;Watch Full Series&rdquo; links (including ReelsGo links) and
                  sponsored partner placements on {BRAND_NAME} are affiliate or referral tracking
                  links. Opening or engaging with these partner links may earn {BRAND_NAME} a
                  commission or reward credit at no extra cost to you.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-[#E8C96D]">2. Privacy &amp; Data Storage</h3>
                <p>
                  {BRAND_NAME} stores your player progress, coin balance, watchlist, and tracking ID
                  locally in your browser and, when signed in or synced, in our cloud database so
                  your rewards stay intact across sessions. Optional feedback, series requests, and
                  support messages are transmitted solely to process your request.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-[#E8C96D]">3. Catalog Metadata Attribution</h3>
                <p>
                  Show metadata, synopses, cover artwork, and official trailer references are
                  provided by{' '}
                  <strong className="text-white">TVMaze</strong> and{' '}
                  <strong className="text-white">Jikan (MyAnimeList)</strong> public APIs. All
                  trademarks and show artwork belong to their respective owners.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-[#E8C96D]">4. Support &amp; Inquiries</h3>
                <p className="text-[#9E978B]">
                  For privacy questions or support inquiries, contact{' '}
                  <span className="text-white font-medium">gerinaicker04@gmail.com</span> or use the
                  in-app VIP Support chat.
                </p>
              </section>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3D36B] text-black font-bold text-xs sm:text-sm cursor-pointer hover:brightness-105 transition"
              >
                Close
              </button>
            </div>
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
