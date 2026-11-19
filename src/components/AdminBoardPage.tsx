import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Lock,
  LogOut,
  Link2,
  Film,
  Trash2,
  Plus,
  Coins,
  Check,
  Pencil,
  Code2,
  Gift,
  Trophy,
  RotateCcw,
  Upload,
  FolderPlus,
  Image as ImageIcon,
  Video,
  ArrowUp,
  ArrowDown,
  Table2,
  MessageSquare,
  CheckCircle2,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ADMIN_NOTIFICATION_EMAIL,
  ADMIN_PASSCODE,
  BRAND_NAME,
  DEFAULT_LIVE_TICKER_NAMES,
  DEFAULT_POOL_PRIZE_ZAR,
  DEFAULT_REAL_AD_SCRIPT,
  DEFAULT_VIDEO_START_SECONDS,
  DRAMA_CATEGORIES,
  R3_BOOST_ZAR,
  R3_MYSTERY_CYCLE_ADS,
  extractYouTubeId,
  extractYouTubePlaylistId,
  getCanonicalVideoKey,
  getEpisodeSeriesId,
  getYouTubePreviewEmbedUrl,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isYouTubeDomainOnly,
  normalizeEpisodeStartSeconds,
  sanitizeMediaUrl,
  toSeriesId,
} from '../constants';
import {
  AppConfig,
  DramaEpisode,
  LeaderboardPlayer,
  MysteryWinnerRecord,
  PrizeWinRecord,
  SupportMessageRecord,
  SupportStatus,
} from '../types';
import { resolveEpisodeCover } from '../utils/localState';
import { saveMediaFile, useResolvedMediaUrl } from '../utils/mediaStore';

export interface AdminEpisodeFormInput {
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
}

interface AdminBoardPageProps {
  unlocked: boolean;
  firebaseUserEmail?: string | null;
  appConfig: AppConfig;
  sections: string[];
  episodes: DramaEpisode[];
  players: LeaderboardPlayer[];
  mysteryWinners: MysteryWinnerRecord[];
  supportMessages?: SupportMessageRecord[];
  prizeWins?: PrizeWinRecord[];
  onBackToApp: () => void;
  onUnlock: (passcode: string) => Promise<void>;
  onConnectFirebaseAdmin?: () => Promise<void>;
  onLockAdmin: () => void;
  onCreateSection: (name: string) => void | Promise<void>;
  onRenameSection: (oldName: string, newName: string) => Promise<void>;
  onDeleteSection: (name: string, removeEpisodes?: boolean) => Promise<void>;
  onUpdateSponsorUrl: (newUrl: string) => Promise<void>;
  onUpdateEmbeddedAdHtml: (html: string) => Promise<void>;
  onUpdateLiveTicker: (enabled: boolean, names: string[]) => Promise<void>;
  onUpdateMysteryAndRollover: (updates: {
    r5WinnerUsername?: string;
    nextPickWinsR5?: boolean;
    poolPrizeZar: number;
    rolloverAmountZar: number;
    lastPoolWinnerSummary?: string;
    lastWinnerUids?: string[];
  }) => Promise<void>;
  onTriggerSundayRollover: () => Promise<{
    outcome: 'distributed' | 'rolled_over';
    summary: string;
    nextPoolZar: number;
    playersReset: number;
  }>;
  onAddEpisode: (input: AdminEpisodeFormInput & { sortOrder: number }) => Promise<void>;
  onUpdateEpisode: (episodeId: string, input: AdminEpisodeFormInput) => Promise<void>;
  onDeleteEpisode: (episodeId: string) => Promise<void>;
  onReorderSeries: (orderedSeriesNames: string[]) => Promise<void>;
  onRestoreDefaultEpisodes: () => Promise<void>;
  onAdjustPlayerCoins: (
    player: LeaderboardPlayer,
    newCoins: number,
    newWeeklyCoins: number
  ) => Promise<void>;
  onResolveSupportMessage?: (
    msg: SupportMessageRecord,
    status: SupportStatus,
    adminNote?: string
  ) => void | Promise<void>;
}

const ResolvedThumb: React.FC<{ src: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const cleanSrc = src === 'none' ? '' : src;
  const resolved = useResolvedMediaUrl(cleanSrc);
  if (!resolved) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0C0C10] text-[#8D867A] gap-1 p-2 text-center">
        <ImageIcon className="w-5 h-5" />
        <span className="text-[10px]">No Thumbnail</span>
      </div>
    );
  }
  return <img src={resolved} alt={alt} referrerPolicy="no-referrer" className={className} />;
};

const AdminVideoPreview: React.FC<{ videoUrl: string; title: string }> = ({
  videoUrl,
  title,
}) => {
  const raw = sanitizeMediaUrl(videoUrl.trim());
  const previewEmbed = raw ? getYouTubePreviewEmbedUrl(raw) : null;
  const domainOnly = raw ? isYouTubeDomainOnly(raw) : false;
  const resolvedDirect = useResolvedMediaUrl(previewEmbed || domainOnly ? '' : raw);

  if (previewEmbed) {
    return (
      <iframe
        key={`yt-preview-${previewEmbed}`}
        src={previewEmbed}
        title={title || 'YouTube Video / Playlist Preview'}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="w-full h-full border-0 block"
      />
    );
  }

  if (resolvedDirect) {
    const isDirectVid =
      resolvedDirect.startsWith('blob:') ||
      resolvedDirect.startsWith('data:video') ||
      /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(raw);
    if (isDirectVid) {
      return (
        <video
          key={`vid-preview-${resolvedDirect}`}
          src={resolvedDirect}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-black"
        />
      );
    }
    return (
      <iframe
        key={`ext-preview-${resolvedDirect}`}
        src={resolvedDirect}
        title={title || 'Video Preview'}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className="w-full h-full border-0 block"
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#08080B] text-[#8D867A] gap-1.5 p-3 text-center">
      <Video className="w-6 h-6 text-[#D4AF37]/50" />
      <span className="text-[11px]">Paste a YouTube video/playlist link, MP4 URL, or upload a video</span>
    </div>
  );
};

const NEW_SERIES_OPTION = '__NEW_SERIES__';

function computeNextEpisodeNumber(seriesEpisodes: DramaEpisode[]): number {
  let maxNum = 0;
  for (const ep of seriesEpisodes) {
    const labelMatch = (ep.episodeLabel || '').match(/(\d+)/);
    if (labelMatch) {
      const parsed = Number(labelMatch[1]);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return Math.max(seriesEpisodes.length + 1, maxNum + 1, 1);
}

function formatEpisodeLabel(num: number): string {
  return `EP ${String(Math.max(1, Math.round(num))).padStart(2, '0')}`;
}

export const AdminBoardPage: React.FC<AdminBoardPageProps> = ({
  unlocked,
  firebaseUserEmail = null,
  appConfig,
  sections,
  episodes,
  players,
  mysteryWinners,
  supportMessages = [],
  prizeWins = [],
  onBackToApp,
  onUnlock,
  onConnectFirebaseAdmin,
  onLockAdmin,
  onCreateSection,
  onRenameSection,
  onDeleteSection,
  onUpdateSponsorUrl,
  onUpdateEmbeddedAdHtml,
  onUpdateLiveTicker,
  onUpdateMysteryAndRollover,
  onTriggerSundayRollover,
  onAddEpisode,
  onUpdateEpisode,
  onDeleteEpisode,
  onReorderSeries,
  onRestoreDefaultEpisodes,
  onAdjustPlayerCoins,
  onResolveSupportMessage,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [connectingFirebase, setConnectingFirebase] = useState(false);

  const [newSectionInput, setNewSectionInput] = useState('');
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [renameSectionValue, setRenameSectionValue] = useState('');
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<string | null>(null);
  const [previewPublishedId, setPreviewPublishedId] = useState<string | null>(null);
  const [optimisticSections, setOptimisticSections] = useState<string[]>([]);

  const [sponsorUrlInput, setSponsorUrlInput] = useState(appConfig.sponsorAdUrl);
  const [savingUrl, setSavingUrl] = useState(false);

  const [embeddedAdInput, setEmbeddedAdInput] = useState(appConfig.embeddedAdHtml || '');
  const [savingEmbed, setSavingEmbed] = useState(false);

  const [r5WinnerUsernameInput, setR5WinnerUsernameInput] = useState(
    appConfig.r5WinnerUsername || ''
  );
  const [nextPickWinsR5Input, setNextPickWinsR5Input] = useState(
    Boolean(appConfig.nextPickWinsR5)
  );
  const [poolPrizeInput, setPoolPrizeInput] = useState(String(appConfig.poolPrizeZar ?? 50));
  const [rolloverInput, setRolloverInput] = useState(
    String(appConfig.rolloverAmountZar ?? 0)
  );
  const [savingVaultConfig, setSavingVaultConfig] = useState(false);

  const [tickerEnabledInput, setTickerEnabledInput] = useState(
    appConfig.liveTickerEnabled !== false
  );
  const [tickerNamesInput, setTickerNamesInput] = useState(
    (appConfig.liveTickerNames && appConfig.liveTickerNames.length > 0
      ? appConfig.liveTickerNames
      : DEFAULT_LIVE_TICKER_NAMES
    ).join(', ')
  );
  const [savingTicker, setSavingTicker] = useState(false);

  const existingSeriesCatalog = useMemo(() => {
    const orderedNames: string[] = [];
    const seenIds = new Map<string, string>();

    const registerName = (rawName: string) => {
      const trimmed = rawName.trim();
      if (!trimmed) return;
      const sId = toSeriesId(trimmed);
      if (!seenIds.has(sId)) {
        seenIds.set(sId, trimmed);
        orderedNames.push(trimmed);
      }
    };

    sections.forEach(registerName);
    optimisticSections.forEach(registerName);
    episodes.forEach((ep) => {
      if (ep.series?.trim()) registerName(ep.series);
    });

    return orderedNames.map((seriesName) => {
      const sId = toSeriesId(seriesName);
      const seriesEps = episodes
        .filter((ep) => getEpisodeSeriesId(ep) === sId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const lead = seriesEps[0] || null;
      const category = lead
        ? inferEpisodeCategory(seriesName, lead.title, lead.category)
        : inferEpisodeCategory(seriesName);
      const nextNum = computeNextEpisodeNumber(seriesEps);
      return {
        seriesId: sId,
        seriesName,
        episodes: seriesEps,
        episodeCount: seriesEps.length,
        category,
        nextEpNumber: nextNum,
        nextEpLabel: formatEpisodeLabel(nextNum),
      };
    });
  }, [sections, optimisticSections, episodes]);

  const existingSeriesList = useMemo(
    () => existingSeriesCatalog.map((item) => item.seriesName),
    [existingSeriesCatalog]
  );

  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epCoverUrl, setEpCoverUrl] = useState('');
  const [epTitle, setEpTitle] = useState('');
  const [seriesSelect, setSeriesSelect] = useState<string>(
    existingSeriesList[0] || NEW_SERIES_OPTION
  );
  const [customSeriesName, setCustomSeriesName] = useState('');
  const [epCategory, setEpCategory] = useState<string>(() =>
    existingSeriesCatalog[0]?.category || 'Drama'
  );
  const [epCategoryManual, setEpCategoryManual] = useState(false);
  const [epLabel, setEpLabel] = useState(() =>
    existingSeriesCatalog[0]?.nextEpLabel || 'EP 01'
  );
  const [epDuration, setEpDuration] = useState('Watch 30s+');
  const [epReward, setEpReward] = useState('150');
  const [epStartTime, setEpStartTime] = useState(String(DEFAULT_VIDEO_START_SECONDS));
  const [epSynopsis, setEpSynopsis] = useState('');
  const [epSponsorUrl, setEpSponsorUrl] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingEp, setSavingEp] = useState(false);
  const [restoringDefaults, setRestoringDefaults] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null);
  const [deletingSectionName, setDeletingSectionName] = useState<string | null>(null);

  const [playerSearch, setPlayerSearch] = useState('');
  const [editingCoins, setEditingCoins] = useState<
    Record<string, { coins: string; weekly: string }>
  >({});
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [supportFilter, setSupportFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [expandedSupportIds, setExpandedSupportIds] = useState<Record<string, boolean>>({});
  const [supportNoteDrafts, setSupportNoteDrafts] = useState<Record<string, string>>({});
  const [resolvingMessageId, setResolvingMessageId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [floatingToast, setFloatingToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showAdminToast = (message: string) => {
    setStatusMessage(message);
    setFloatingToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setFloatingToast(null);
    }, 3200);
  };

  // Series Watch Sheet Quick-Add & Inline Row Drafts
  const [wsTitle, setWsTitle] = useState('');
  const [wsCategory, setWsCategory] = useState<string>('Drama');
  const [wsCategoryManual, setWsCategoryManual] = useState(false);
  const [wsThumbUrl, setWsThumbUrl] = useState('');
  const [wsVideoUrl, setWsVideoUrl] = useState('');
  const [wsDescription, setWsDescription] = useState('');
  const [wsUploadingThumb, setWsUploadingThumb] = useState(false);
  const [wsAdding, setWsAdding] = useState(false);
  const [wsDrafts, setWsDrafts] = useState<
    Record<
      string,
      {
        title: string;
        category: string;
        thumbUrl: string;
        videoUrl: string;
        description: string;
      }
    >
  >({});
  const [wsSavingSeries, setWsSavingSeries] = useState<string | null>(null);

  const episodeFormRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSponsorUrlInput(appConfig.sponsorAdUrl);
    setEmbeddedAdInput(appConfig.embeddedAdHtml || '');
    setR5WinnerUsernameInput(appConfig.r5WinnerUsername || '');
    setNextPickWinsR5Input(Boolean(appConfig.nextPickWinsR5));
    setPoolPrizeInput(String(appConfig.poolPrizeZar ?? 50));
    setRolloverInput(String(appConfig.rolloverAmountZar ?? 0));
    setTickerEnabledInput(appConfig.liveTickerEnabled !== false);
    setTickerNamesInput(
      (appConfig.liveTickerNames && appConfig.liveTickerNames.length > 0
        ? appConfig.liveTickerNames
        : DEFAULT_LIVE_TICKER_NAMES
      ).join(', ')
    );
  }, [
    appConfig.sponsorAdUrl,
    appConfig.embeddedAdHtml,
    appConfig.r5WinnerUsername,
    appConfig.nextPickWinsR5,
    appConfig.poolPrizeZar,
    appConfig.rolloverAmountZar,
    appConfig.liveTickerEnabled,
    appConfig.liveTickerNames,
  ]);

  // Clear optimistic section names once parent `sections` includes them
  useEffect(() => {
    setOptimisticSections((prev) => prev.filter((s) => !sections.includes(s)));
  }, [sections]);

  useEffect(() => {
    if (
      seriesSelect !== NEW_SERIES_OPTION &&
      !existingSeriesList.includes(seriesSelect)
    ) {
      setSeriesSelect(existingSeriesList[0] || NEW_SERIES_OPTION);
    }
  }, [existingSeriesList, seriesSelect]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const extractedVideoId = epVideoUrl.trim() ? extractYouTubeId(epVideoUrl) : null;
  const extractedPlaylistId = epVideoUrl.trim()
    ? extractYouTubePlaylistId(epVideoUrl)
    : null;
  const autoYoutubeThumb = epVideoUrl.trim()
    ? getYouTubeThumbnailUrl(epVideoUrl)
    : null;
  // Strictly prioritize user-supplied or uploaded thumbnail over auto-YouTube fallback
  const previewThumb = epCoverUrl.trim() || autoYoutubeThumb || '';

  const resolvedSeriesName =
    seriesSelect === NEW_SERIES_OPTION ? customSeriesName.trim() : seriesSelect;

  const selectedCatalogSeries = useMemo(() => {
    if (seriesSelect === NEW_SERIES_OPTION) return null;
    const targetId = toSeriesId(seriesSelect);
    return (
      existingSeriesCatalog.find(
        (item) => item.seriesId === targetId || item.seriesName === seriesSelect
      ) || null
    );
  }, [seriesSelect, existingSeriesCatalog]);

  const handleSelectSeriesInForm = (nextSeriesValue: string) => {
    setSeriesSelect(nextSeriesValue);
    if (nextSeriesValue === NEW_SERIES_OPTION) {
      setEpLabel('EP 01');
      if (!epCategoryManual) {
        setEpCategory(inferEpisodeCategory(customSeriesName, epTitle));
      }
      return;
    }
    const found = existingSeriesCatalog.find(
      (item) => item.seriesName === nextSeriesValue || item.seriesId === toSeriesId(nextSeriesValue)
    );
    if (found) {
      setCustomSeriesName('');
      setEpCategory(found.category);
      setEpCategoryManual(false);
      if (!editingEpisodeId) {
        setEpLabel(found.nextEpLabel);
      }
    }
  };

  const resetEpisodeForm = (keepSelectedSeries?: string, nextEpCount?: number) => {
    setEditingEpisodeId(null);
    setEpVideoUrl('');
    setEpCoverUrl('');
    setEpTitle('');
    const targetSeries = keepSelectedSeries || existingSeriesList[0] || NEW_SERIES_OPTION;
    setSeriesSelect(targetSeries);
    setCustomSeriesName('');
    setEpCategoryManual(false);

    const matched = existingSeriesCatalog.find(
      (item) => item.seriesName === targetSeries || item.seriesId === toSeriesId(targetSeries)
    );
    setEpCategory(matched?.category || 'Drama');
    const nextNum =
      typeof nextEpCount === 'number'
        ? nextEpCount
        : matched
          ? matched.nextEpNumber
          : 1;
    setEpLabel(formatEpisodeLabel(nextNum));
    setEpDuration('Watch 30s+');
    setEpReward('150');
    setEpStartTime(String(DEFAULT_VIDEO_START_SECONDS));
    setEpSynopsis('');
    setEpSponsorUrl('');
  };

  const handleStartEditEpisode = (ep: DramaEpisode) => {
    setEditingEpisodeId(ep.id);
    setEpVideoUrl((ep.videoUrl || ep.youtubeUrl || '').trim());
    setEpCoverUrl((ep.thumbnailUrl || ep.coverImage || '').trim());
    setEpTitle(ep.title);
    if (existingSeriesList.includes(ep.series)) {
      setSeriesSelect(ep.series);
      setCustomSeriesName('');
    } else {
      setSeriesSelect(NEW_SERIES_OPTION);
      setCustomSeriesName(ep.series);
    }
    setEpCategory(inferEpisodeCategory(ep.series, ep.title, ep.category));
    setEpCategoryManual(true);
    setEpLabel(ep.episodeLabel);
    setEpDuration(ep.duration);
    setEpReward(String(ep.rewardCoins));
    setEpStartTime(String(normalizeEpisodeStartSeconds(ep.startTime)));
    setEpSynopsis(ep.synopsis);
    setEpSponsorUrl(ep.sponsorUrl || '');
    setStatusMessage(null);
    episodeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleQuickAddEpisodeToSeries = (seriesName: string) => {
    const matched = existingSeriesCatalog.find(
      (item) => item.seriesName === seriesName || item.seriesId === toSeriesId(seriesName)
    );
    setEditingEpisodeId(null);
    setEpVideoUrl('');
    setEpCoverUrl('');
    setEpTitle('');
    setSeriesSelect(seriesName);
    setCustomSeriesName('');
    setEpCategory(matched?.category || inferEpisodeCategory(seriesName));
    setEpCategoryManual(false);
    setEpLabel(matched ? matched.nextEpLabel : 'EP 01');
    setEpDuration('Watch 30s+');
    setEpReward('150');
    setEpStartTime(String(DEFAULT_VIDEO_START_SECONDS));
    setEpSynopsis('');
    setEpSponsorUrl('');
    setStatusMessage(
      `Ready to add ${matched ? matched.nextEpLabel : 'next episode'} inside "${seriesName}".`
    );
    episodeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput !== ADMIN_PASSCODE) {
      setAuthError('Invalid password. Access denied.');
      return;
    }
    setUnlocking(true);
    try {
      await onUnlock(passwordInput);
      setPasswordInput('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to unlock /admin.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    try {
      const refUrl = await saveMediaFile(file);
      setEpCoverUrl(refUrl);
      setStatusMessage(`Uploaded custom thumbnail "${file.name}".`);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to upload thumbnail image.'
      );
    } finally {
      setUploadingThumb(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const refUrl = await saveMediaFile(file);
      setEpVideoUrl(refUrl);
      setStatusMessage(`Uploaded custom video "${file.name}".`);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to upload video file.'
      );
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleCreateSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSectionInput.trim().slice(0, 60);
    if (!trimmed) return;
    setOptimisticSections((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    try {
      await onCreateSection(trimmed);
      setSeriesSelect(trimmed);
      setCustomSeriesName('');
      setEpCategory(inferEpisodeCategory(trimmed));
      setEpCategoryManual(false);
      setEpLabel('EP 01');
      setNewSectionInput('');
      showAdminToast(
        firebaseUserEmail
          ? `Series "${trimmed}" created & synced to Firebase Firestore!`
          : `Series "${trimmed}" created locally (connect Google above to sync across devices).`
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : `Failed to create "${trimmed}".`
      );
    }
  };

  const handleConfirmRenameSection = async (oldName: string) => {
    const cleanNew = renameSectionValue.trim().slice(0, 60);
    if (!cleanNew || cleanNew === oldName) {
      setRenamingSection(null);
      return;
    }
    await onRenameSection(oldName, cleanNew);
    if (seriesSelect === oldName) {
      setSeriesSelect(cleanNew);
    }
    setRenamingSection(null);
    setStatusMessage(`Renamed section "${oldName}" to "${cleanNew}".`);
  };

  const handleConfirmDeleteSection = async (name: string) => {
    setDeletingSectionName(name);
    setStatusMessage(null);
    try {
      await onDeleteSection(name, true);
      setOptimisticSections((prev) => prev.filter((s) => s !== name && toSeriesId(s) !== toSeriesId(name)));
      if (seriesSelect === name || toSeriesId(seriesSelect) === toSeriesId(name)) {
        const nextFallback = existingSeriesList.find((s) => s !== name) || NEW_SERIES_OPTION;
        setSeriesSelect(nextFallback);
      }
      setConfirmDeleteSection(null);
      showAdminToast(
        firebaseUserEmail
          ? `Deleted "${name}" & removed from Firebase Firestore.`
          : `Deleted "${name}" locally (connect Google above to sync across devices).`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : `Failed to delete "${name}".`);
    } finally {
      setDeletingSectionName(null);
    }
  };

  const handleDeleteEpisodeClick = async (ep: DramaEpisode) => {
    setDeletingEpisodeId(ep.id);
    setStatusMessage(null);
    try {
      if (editingEpisodeId === ep.id) {
        resetEpisodeForm();
      }
      if (previewPublishedId === ep.id) {
        setPreviewPublishedId(null);
      }
      await onDeleteEpisode(ep.id);
      showAdminToast(
        firebaseUserEmail
          ? `Deleted "${ep.title}" from Firebase Firestore.`
          : `Deleted "${ep.title}" locally (connect Google above to sync across devices).`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : `Failed to delete "${ep.title}".`);
    } finally {
      setDeletingEpisodeId(null);
    }
  };

  const handleSaveSponsorUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUrl(true);
    setStatusMessage(null);
    try {
      await onUpdateSponsorUrl(sponsorUrlInput);
      showAdminToast(
        firebaseUserEmail
          ? 'Saved! Sponsor Ad URL synced to Firebase for all visitors.'
          : 'Saved! Sponsor Ad URL updated locally (connect Google above to sync to Firebase).'
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to update Sponsor Ad URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveEmbeddedAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmbed(true);
    setStatusMessage(null);
    try {
      await onUpdateEmbeddedAdHtml(embeddedAdInput);
      showAdminToast(
        embeddedAdInput.trim()
          ? firebaseUserEmail
            ? 'Saved! Embedded Ad HTML synced to Firebase for all visitors.'
            : 'Saved! Embedded Ad HTML saved locally (connect Google above to sync to Firebase).'
          : 'Saved! Embedded Ad slot cleared.'
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save embedded ad.');
    } finally {
      setSavingEmbed(false);
    }
  };

  const handleSaveLiveTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTicker(true);
    setStatusMessage(null);
    try {
      const parsedNames = tickerNamesInput
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      await onUpdateLiveTicker(tickerEnabledInput, parsedNames);
      setStatusMessage(
        tickerEnabledInput
          ? 'Live Winner Ticker updated and enabled on Home screen.'
          : 'Live Winner Ticker turned off.'
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save Live Ticker settings.');
    } finally {
      setSavingTicker(false);
    }
  };

  const handleSaveVaultAndRollover = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVaultConfig(true);
    setStatusMessage(null);
    try {
      await onUpdateMysteryAndRollover({
        r5WinnerUsername: r5WinnerUsernameInput.trim(),
        nextPickWinsR5: nextPickWinsR5Input,
        poolPrizeZar: Number(poolPrizeInput) || DEFAULT_POOL_PRIZE_ZAR,
        rolloverAmountZar: Number(rolloverInput) || 0,
      });
      setStatusMessage(
        nextPickWinsR5Input
          ? `Saved! Next Mystery Box pick by any player will unlock the R${R3_BOOST_ZAR} Progress Bar Boost (+1,000 Coins & +R${R3_BOOST_ZAR} added to pool).`
          : r5WinnerUsernameInput.trim()
            ? `Saved! "${r5WinnerUsernameInput.trim()}" is set to unlock the R${R3_BOOST_ZAR} Progress Bar Boost on their next Mystery Box pick.`
            : `Mystery Vault (${R3_MYSTERY_CYCLE_ADS}-Ad R${R3_BOOST_ZAR} Reset Cycle) & Sunday Prize Pool saved.`
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to update Mystery Vault settings.'
      );
    } finally {
      setSavingVaultConfig(false);
    }
  };

  const handleQuickTestRollover = async () => {
    setSavingVaultConfig(true);
    setStatusMessage(null);
    try {
      const currentPool = Number(poolPrizeInput) || DEFAULT_POOL_PRIZE_ZAR;
      const nextPool = currentPool + DEFAULT_POOL_PRIZE_ZAR;
      await onUpdateMysteryAndRollover({
        r5WinnerUsername: r5WinnerUsernameInput.trim(),
        nextPickWinsR5: nextPickWinsR5Input,
        poolPrizeZar: nextPool,
        rolloverAmountZar: currentPool,
        lastPoolWinnerSummary: '',
        lastWinnerUids: [],
      });
      setStatusMessage(`Test rollover applied: Pool rolled over from R${currentPool} to R${nextPool}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Rollover failed.');
    } finally {
      setSavingVaultConfig(false);
    }
  };

  const handleResetPoolBase = async () => {
    setSavingVaultConfig(true);
    setStatusMessage(null);
    try {
      await onUpdateMysteryAndRollover({
        r5WinnerUsername: r5WinnerUsernameInput.trim(),
        nextPickWinsR5: nextPickWinsR5Input,
        poolPrizeZar: DEFAULT_POOL_PRIZE_ZAR,
        rolloverAmountZar: 0,
        lastPoolWinnerSummary: '',
        lastWinnerUids: [],
      });
      setStatusMessage(`Sunday Prize Pool reset to base R${DEFAULT_POOL_PRIZE_ZAR}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Pool reset failed.');
    } finally {
      setSavingVaultConfig(false);
    }
  };

  const handleForceSundayResetNow = async () => {
    setSavingVaultConfig(true);
    setStatusMessage(null);
    try {
      const res = await onTriggerSundayRollover();
      setStatusMessage(
        `Sunday Reset Complete: ${res.summary} (${res.playersReset} player${res.playersReset === 1 ? '' : 's'} reset to 0 weekly coins).`
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to run Sunday reset.');
    } finally {
      setSavingVaultConfig(false);
    }
  };

  const handleSubmitEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSeriesName) return;
    setSavingEp(true);
    setStatusMessage(null);

    const finalEpLabel = epLabel.trim() || 'EP 01';
    const finalTitle = epTitle.trim() || `${resolvedSeriesName} — ${finalEpLabel}`;
    const targetSeriesId = toSeriesId(resolvedSeriesName);
    const targetCategory =
      epCategory.trim() || inferEpisodeCategory(resolvedSeriesName, finalTitle);

    const cleanVideo = sanitizeMediaUrl(epVideoUrl.trim());
    const explicitThumb = sanitizeMediaUrl(epCoverUrl.trim());
    const finalThumb =
      explicitThumb ||
      (cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) || '' : '') ||
      autoYoutubeThumb ||
      '';

    const payload: AdminEpisodeFormInput = {
      title: finalTitle,
      series: resolvedSeriesName,
      seriesId: targetSeriesId,
      category: targetCategory,
      episodeLabel: finalEpLabel,
      duration: epDuration.trim() || 'Watch 30s+',
      rewardCoins: Number(epReward) || 100,
      coverImage: finalThumb,
      thumbnailUrl: finalThumb,
      synopsis:
        epSynopsis.trim() || `${resolvedSeriesName} exclusive short-drama episode.`,
      sponsorUrl: epSponsorUrl.trim(),
      youtubeUrl: cleanVideo,
      videoUrl: cleanVideo,
      startTime: normalizeEpisodeStartSeconds(
        epStartTime.trim() === '' ? DEFAULT_VIDEO_START_SECONDS : Number(epStartTime)
      ),
    };

    try {
      const incomingVideoKey = getCanonicalVideoKey(cleanVideo);
      if (incomingVideoKey) {
        const duplicateInSeries = episodes.find(
          (ep) =>
            ep.id !== editingEpisodeId &&
            getEpisodeSeriesId(ep) === targetSeriesId &&
            getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl) === incomingVideoKey
        );
        if (duplicateInSeries) {
          setStatusMessage(
            `Duplicate blocked: "${duplicateInSeries.episodeLabel}" ("${duplicateInSeries.title}") already uses this video URL in "${resolvedSeriesName}".`
          );
          return;
        }
      }

      if (editingEpisodeId) {
        await onUpdateEpisode(editingEpisodeId, payload);
        showAdminToast(
          firebaseUserEmail
            ? `Saved & synced! Updated "${finalTitle}" in "${resolvedSeriesName}".`
            : `Updated "${finalTitle}" locally (connect Google above to sync across devices).`
        );
        resetEpisodeForm(resolvedSeriesName);
      } else {
        const existingSeriesEps = episodes.filter(
          (ep) => getEpisodeSeriesId(ep) === targetSeriesId
        );
        const currentMaxSort = existingSeriesEps.reduce(
          (acc, ep) => Math.max(acc, ep.sortOrder || 0),
          0
        );
        const nextNumAfterSave = Math.max(
          computeNextEpisodeNumber(existingSeriesEps) + 1,
          existingSeriesEps.length + 2
        );
        await onAddEpisode({
          ...payload,
          sortOrder: currentMaxSort > 0 ? currentMaxSort + 1 : episodes.length + 1,
        });
        showAdminToast(
          firebaseUserEmail
            ? `Published & synced! Added "${finalEpLabel}" to "${resolvedSeriesName}".`
            : `Added "${finalEpLabel}" locally (connect Google above to sync across devices).`
        );
        resetEpisodeForm(resolvedSeriesName, nextNumAfterSave);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to save episode.');
    } finally {
      setSavingEp(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setRestoringDefaults(true);
    setStatusMessage(null);
    try {
      await onRestoreDefaultEpisodes();
      resetEpisodeForm();
      showAdminToast('Saved! Catalog cleared to clean empty state.');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Unable to clear catalog.'
      );
    } finally {
      setRestoringDefaults(false);
    }
  };

  // Watch Sheet helpers: one clean row per series folder
  const watchSheetRows = useMemo(() => {
    return existingSeriesCatalog.map((catalogItem) => {
      const seriesEps = catalogItem.episodes;
      const lead = seriesEps[0] || null;
      const thumb = lead ? resolveEpisodeCover(lead) : '';
      const rawVid = lead ? (lead.videoUrl || lead.youtubeUrl || '').trim() : '';
      const desc = lead
        ? lead.synopsis || lead.episodeLabel || `${seriesEps.length} Episode(s)`
        : '0 Episodes';
      return {
        seriesId: catalogItem.seriesId,
        seriesName: catalogItem.seriesName,
        category: catalogItem.category,
        episodeCount: seriesEps.length,
        episodes: seriesEps,
        leadEpisode: lead,
        thumbUrl: thumb,
        videoUrl: rawVid,
        description: desc,
      };
    });
  }, [existingSeriesCatalog]);

  const handleWsQuickThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWsUploadingThumb(true);
    try {
      const refUrl = await saveMediaFile(file);
      setWsThumbUrl(refUrl);
      setStatusMessage(`Uploaded Watch Sheet cover "${file.name}".`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to upload cover image.');
    } finally {
      setWsUploadingThumb(false);
      e.target.value = '';
    }
  };

  const handleWsRowThumbUpload = async (
    seriesKey: string,
    baseDraft: {
      title: string;
      category: string;
      thumbUrl: string;
      videoUrl: string;
      description: string;
    },
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const refUrl = await saveMediaFile(file);
      setWsDrafts((prev) => ({
        ...prev,
        [seriesKey]: { ...baseDraft, thumbUrl: refUrl },
      }));
      setStatusMessage(`Ready to save uploaded cover for "${seriesKey}". Click Save Row.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleWsAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = wsTitle.trim().slice(0, 60);
    if (!cleanTitle) return;
    setWsAdding(true);
    setStatusMessage(null);
    try {
      const cleanVideo = sanitizeMediaUrl(wsVideoUrl.trim());
      const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
      const finalThumb = sanitizeMediaUrl(wsThumbUrl.trim()) || autoThumb || '';
      const cleanDesc = wsDescription.trim() || `${cleanTitle} drama series playlist.`;
      const targetSeriesId = toSeriesId(cleanTitle);
      const targetCategory = wsCategory.trim() || inferEpisodeCategory(cleanTitle);

      setOptimisticSections((prev) => (prev.includes(cleanTitle) ? prev : [...prev, cleanTitle]));
      await onCreateSection(cleanTitle);
      await onAddEpisode({
        title: `${cleanTitle} — EP 01`,
        series: cleanTitle,
        seriesId: targetSeriesId,
        category: targetCategory,
        episodeLabel: 'EP 01',
        duration: 'Watch & Earn',
        rewardCoins: 100,
        coverImage: finalThumb,
        thumbnailUrl: finalThumb,
        synopsis: cleanDesc.slice(0, 240),
        sponsorUrl: '',
        youtubeUrl: cleanVideo,
        videoUrl: cleanVideo,
        startTime: DEFAULT_VIDEO_START_SECONDS,
        sortOrder: episodes.length + 1,
      });

      setWsDrafts((prev) => {
        const next = { ...prev };
        delete next[cleanTitle];
        return next;
      });
      setSeriesSelect(cleanTitle);
      setEpCategory(targetCategory);
      setEpLabel('EP 02');
      setWsTitle('');
      setWsCategory('Drama');
      setWsCategoryManual(false);
      setWsThumbUrl('');
      setWsVideoUrl('');
      setWsDescription('');
      showAdminToast(`Added "${cleanTitle}" (${targetCategory}) to Series Watch Sheet!`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to add Watch Sheet row.');
    } finally {
      setWsAdding(false);
    }
  };

  const handleWsSaveRow = async (
    row: {
      seriesId: string;
      seriesName: string;
      category: string;
      episodes: DramaEpisode[];
      leadEpisode: DramaEpisode | null;
      thumbUrl: string;
      videoUrl: string;
      description: string;
    },
    draft: {
      title: string;
      category: string;
      thumbUrl: string;
      videoUrl: string;
      description: string;
    }
  ) => {
    const cleanSeriesTitle = draft.title.trim().slice(0, 60);
    if (!cleanSeriesTitle) return;
    setWsSavingSeries(row.seriesName);
    setStatusMessage(null);
    try {
      let targetSeries = row.seriesName;
      if (cleanSeriesTitle !== row.seriesName) {
        await onRenameSection(row.seriesName, cleanSeriesTitle);
        targetSeries = cleanSeriesTitle;
      }

      const targetSeriesId = toSeriesId(targetSeries);
      const targetCategory =
        draft.category.trim() || inferEpisodeCategory(targetSeries);
      const cleanVideo = sanitizeMediaUrl(draft.videoUrl.trim());
      const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
      const finalThumb = sanitizeMediaUrl(draft.thumbUrl.trim()) || autoThumb || '';
      const cleanDesc = draft.description.trim() || `${targetSeries} drama series.`;

      const incomingWsVideoKey = getCanonicalVideoKey(cleanVideo);
      if (incomingWsVideoKey) {
        const duplicateSibling = row.episodes.find(
          (ep) =>
            ep.id !== row.leadEpisode?.id &&
            getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl) === incomingWsVideoKey
        );
        if (duplicateSibling) {
          setStatusMessage(
            `Duplicate blocked: "${duplicateSibling.episodeLabel}" in "${targetSeries}" already uses this video URL.`
          );
          return;
        }
      }

      if (row.leadEpisode) {
        await onUpdateEpisode(row.leadEpisode.id, {
          title: row.leadEpisode.title || `${targetSeries} — EP 01`,
          series: targetSeries,
          seriesId: targetSeriesId,
          category: targetCategory,
          episodeLabel: row.leadEpisode.episodeLabel || 'EP 01',
          duration: row.leadEpisode.duration || 'Watch & Earn',
          rewardCoins: row.leadEpisode.rewardCoins || 100,
          coverImage: finalThumb,
          thumbnailUrl: finalThumb,
          synopsis: cleanDesc.slice(0, 240),
          sponsorUrl: row.leadEpisode.sponsorUrl || '',
          youtubeUrl: cleanVideo,
          videoUrl: cleanVideo,
          startTime: row.leadEpisode.startTime,
        });

        // Keep sibling episodes in the same series aligned with the updated series genre
        for (const sibling of row.episodes) {
          if (sibling.id !== row.leadEpisode.id && sibling.category !== targetCategory) {
            await onUpdateEpisode(sibling.id, {
              title: sibling.title,
              series: targetSeries,
              seriesId: targetSeriesId,
              category: targetCategory,
              episodeLabel: sibling.episodeLabel,
              duration: sibling.duration,
              rewardCoins: sibling.rewardCoins,
              coverImage: sibling.coverImage,
              thumbnailUrl: sibling.thumbnailUrl,
              synopsis: sibling.synopsis,
              sponsorUrl: sibling.sponsorUrl || '',
              youtubeUrl: sibling.youtubeUrl,
              videoUrl: sibling.videoUrl,
              startTime: sibling.startTime,
            });
          }
        }
      } else {
        await onAddEpisode({
          title: `${targetSeries} — EP 01`,
          series: targetSeries,
          seriesId: targetSeriesId,
          category: targetCategory,
          episodeLabel: 'EP 01',
          duration: 'Watch & Earn',
          rewardCoins: 100,
          coverImage: finalThumb,
          thumbnailUrl: finalThumb,
          synopsis: cleanDesc.slice(0, 240),
          sponsorUrl: '',
          youtubeUrl: cleanVideo,
          videoUrl: cleanVideo,
          startTime: DEFAULT_VIDEO_START_SECONDS,
          sortOrder: episodes.length + 1,
        });
      }

      setWsDrafts((prev) => {
        const next = { ...prev };
        delete next[row.seriesName];
        return next;
      });
      showAdminToast(`Saved "${targetSeries}" (${targetCategory}).`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to save Watch Sheet row.');
    } finally {
      setWsSavingSeries(null);
    }
  };

  const handleWsMoveRow = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= existingSeriesList.length) return;
    const reordered = [...existingSeriesList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    await onReorderSeries(reordered);
    setStatusMessage(`Moved "${moved}" ${direction < 0 ? 'up' : 'down'} in Series Watch Sheet.`);
  };

  const filteredPlayers = players.filter((p) =>
    p.username.toLowerCase().includes(playerSearch.toLowerCase().trim())
  );

  const openSupportCount = supportMessages.filter((m) => m.status === 'open').length;
  const resolvedSupportCount = supportMessages.filter((m) => m.status === 'resolved').length;
  const visibleSupportMessages = supportMessages.filter((m) => {
    if (supportFilter === 'all') return true;
    return m.status === supportFilter;
  });

  const handleToggleResolveSupport = async (
    msg: SupportMessageRecord,
    nextStatus: SupportStatus
  ) => {
    if (!onResolveSupportMessage) return;
    setResolvingMessageId(msg.id);
    setStatusMessage(null);
    try {
      const note = supportNoteDrafts[msg.id] ?? msg.adminNote ?? '';
      await onResolveSupportMessage(msg, nextStatus, note);
      showAdminToast(
        nextStatus === 'resolved'
          ? `Support ticket from ${msg.username} marked resolved.`
          : `Support ticket from ${msg.username} reopened.`
      );
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Unable to update ticket status.'
      );
    } finally {
      setResolvingMessageId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F6F2E9] pb-16">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 h-[56px] bg-[#09090D]/95 backdrop-blur-md border-b border-[#D4AF37]/25">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToApp}
              className="min-h-[40px] px-3 rounded-xl border border-white/[0.12] text-xs font-semibold text-[#F6F2E9] hover:border-[#D4AF37]/50 inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
              <span>Back to App</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] truncate">
                {BRAND_NAME} — /admin Board
              </h1>
            </div>
          </div>

          {unlocked && (
            <button
              type="button"
              onClick={onLockAdmin}
              className="min-h-[38px] px-3 rounded-lg border border-red-500/30 text-red-200 hover:bg-red-950/40 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Admin</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {!unlocked ? (
          <section className="max-w-md mx-auto mt-10 obsidian-card rounded-2xl p-6 sm:p-8 space-y-5 border border-[#D4AF37]/40 shadow-2xl">
            <div className="w-12 h-12 rounded-xl gold-gradient-bg text-[#181307] mx-auto flex items-center justify-center shadow-lg shadow-[#D4AF37]/25">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                Restricted /admin Route
              </p>
              <h2 className="text-2xl font-display font-bold text-[#F6F2E9]">
                Admin Password Required
              </h2>
              <p className="text-xs text-[#A69F91]">
                Enter the {BRAND_NAME} operator passcode to manage episode sections, videos, thumbnails, and rewards.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-route-password"
                  className="block text-xs font-semibold text-[#E8C96D]"
                >
                  Admin Passcode
                </label>
                <input
                  id="admin-route-password"
                  type="password"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full min-h-[46px] px-4 rounded-xl bg-[#070709] border border-[#D4AF37]/30 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-300 bg-red-950/50 border border-red-500/35 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={unlocking}
                className="w-full min-h-[46px] rounded-xl gold-gradient-bg text-[#181307] font-bold text-sm hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {unlocking ? 'Verifying...' : 'Unlock /admin Board'}
              </button>
            </form>
          </section>
        ) : (
          <>
            {floatingToast && (
              <div
                role="status"
                aria-live="polite"
                className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-md pointer-events-none"
              >
                <div className="pointer-events-auto rounded-xl gold-gradient-bg border border-[#FCE7A2] text-[#181307] px-4 py-2.5 shadow-2xl shadow-[#D4AF37]/35 flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{floatingToast}</span>
                </div>
              </div>
            )}

            {/* Firebase Firestore Live Persistence Status Bar */}
            <div
              className={`rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                firebaseUserEmail
                  ? 'bg-[#0F1711] border-emerald-500/35 text-emerald-200'
                  : 'bg-[#17130A] border-[#D4AF37]/40 text-[#FCE7A2]'
              }`}
            >
              <span className="font-medium">
                {firebaseUserEmail
                  ? `Firebase Firestore Connected (${firebaseUserEmail}) — All saves sync live for every visitor.`
                  : 'Not signed into Google Firebase Auth yet — Connect Google so Sponsor URL, Embed Ads, and Episodes persist in Firestore for all visitors.'}
              </span>
              {!firebaseUserEmail && onConnectFirebaseAdmin && (
                <button
                  type="button"
                  disabled={connectingFirebase}
                  onClick={async () => {
                    setConnectingFirebase(true);
                    try {
                      await onConnectFirebaseAdmin();
                      showAdminToast('Connected! Firebase Firestore live sync enabled.');
                    } catch (err) {
                      setStatusMessage(
                        err instanceof Error ? err.message : 'Google sign-in was cancelled.'
                      );
                    } finally {
                      setConnectingFirebase(false);
                    }
                  }}
                  className="min-h-[34px] px-3.5 rounded-lg gold-gradient-bg text-[#181307] font-bold text-xs whitespace-nowrap hover:brightness-105 disabled:opacity-60 cursor-pointer"
                >
                  {connectingFirebase ? 'Connecting...' : 'Connect Firebase (Google)'}
                </button>
              )}
            </div>

            {statusMessage && (
              <div
                role="status"
                className="rounded-xl bg-[#16140D] border border-[#D4AF37]/55 px-4 py-3 text-xs sm:text-sm text-[#FCE7A2] flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* 0. Series Watch Sheet — Spreadsheet-Style Fast Manual Series Manager */}
            <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-5 border border-[#D4AF37]/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-lg sm:text-xl font-display font-bold text-[#F6F2E9]">
                    Series Watch Sheet ({watchSheetRows.length})
                  </h2>
                </div>
                <span className="text-[11px] font-mono-num text-[#E8C96D]">
                  Fast Manual Series Rows → Syncs Directly to Watch / Series Tab
                </span>
              </div>

              {/* Quick-Add Row Bar */}
              <form
                onSubmit={handleWsAddRow}
                className="rounded-xl bg-[#09090D] border border-[#D4AF37]/30 p-3.5 sm:p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-[#FCE7A2]">
                  Quick-Add New Series Row
                </p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Series Title *</label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={wsTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWsTitle(val);
                        if (!wsCategoryManual) {
                          setWsCategory(inferEpisodeCategory(val));
                        }
                      }}
                      placeholder="e.g. Midnight Vows"
                      className="w-full min-h-[42px] px-3 rounded-lg bg-[#070709] border border-white/[0.12] text-xs sm:text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Genre / Category</label>
                    <select
                      value={wsCategory}
                      onChange={(e) => {
                        setWsCategory(e.target.value);
                        setWsCategoryManual(true);
                      }}
                      className="w-full min-h-[42px] px-2.5 rounded-lg bg-[#070709] border border-white/[0.12] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    >
                      {DRAMA_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Cover Thumbnail URL / Upload</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={wsThumbUrl}
                        onChange={(e) => setWsThumbUrl(e.target.value)}
                        placeholder="https://... or upload"
                        className="flex-1 min-w-0 min-h-[42px] px-3 rounded-lg bg-[#070709] border border-white/[0.12] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                      />
                      <label className="min-h-[42px] px-2.5 rounded-lg border border-[#D4AF37]/40 bg-[#15120A] text-[#FCE7A2] hover:bg-[#1F1A0D] text-[11px] font-semibold inline-flex items-center justify-center cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="sr-only">Upload cover image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handleWsQuickThumbUpload(e)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] text-[#A69F91]">EP 01 Video URL</label>
                    <input
                      type="text"
                      value={wsVideoUrl}
                      onChange={(e) => setWsVideoUrl(e.target.value)}
                      placeholder="https://youtu.be/..."
                      className="w-full min-h-[42px] px-3 rounded-lg bg-[#070709] border border-white/[0.12] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Description</label>
                    <input
                      type="text"
                      value={wsDescription}
                      onChange={(e) => setWsDescription(e.target.value)}
                      placeholder="Short hook..."
                      className="w-full min-h-[42px] px-3 rounded-lg bg-[#070709] border border-white/[0.12] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={wsAdding || wsUploadingThumb}
                    className="min-h-[42px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 hover:brightness-105 disabled:opacity-60 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{wsAdding ? 'Adding...' : '+ Add Row to Watch Sheet'}</span>
                  </button>
                </div>
              </form>

              {/* Spreadsheet Table Rows */}
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#070709]">
                <table className="w-full text-left border-collapse min-w-[940px]">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-[#0D0D13] text-[11px] font-semibold uppercase tracking-wider text-[#A69F91]">
                      <th className="py-2.5 px-3 w-20">Order</th>
                      <th className="py-2.5 px-3">Series Title</th>
                      <th className="py-2.5 px-3 w-32">Genre</th>
                      <th className="py-2.5 px-3">Cover Thumbnail</th>
                      <th className="py-2.5 px-3">Lead Video URL</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right w-52">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-xs">
                    {watchSheetRows.map((row, index) => {
                      const draft = wsDrafts[row.seriesName] || {
                        title: row.seriesName,
                        category: row.category,
                        thumbUrl: row.thumbUrl,
                        videoUrl: row.videoUrl,
                        description: row.description,
                      };
                      const updateDraft = (patch: Partial<typeof draft>) => {
                        setWsDrafts((prev) => ({
                          ...prev,
                          [row.seriesName]: { ...draft, ...patch },
                        }));
                      };
                      const isRowSaving = wsSavingSeries === row.seriesName;

                      return (
                        <tr key={row.seriesId} className="hover:bg-white/[0.02] align-middle">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <span className="font-mono-num text-[#E8C96D] w-4">
                                {index + 1}
                              </span>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => void handleWsMoveRow(index, -1)}
                                aria-label={`Move ${row.seriesName} up`}
                                className="p-1 rounded border border-white/10 text-[#A69F91] hover:text-[#FCE7A2] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === watchSheetRows.length - 1}
                                onClick={() => void handleWsMoveRow(index, 1)}
                                aria-label={`Move ${row.seriesName} down`}
                                className="p-1 rounded border border-white/10 text-[#A69F91] hover:text-[#FCE7A2] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              maxLength={60}
                              value={draft.title}
                              onChange={(e) => updateDraft({ title: e.target.value })}
                              className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#0D0D13] border border-white/[0.1] text-xs font-semibold text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                            />
                            <p className="text-[10px] text-[#8D867A] mt-1 font-mono-num">
                              {row.episodeCount} {row.episodeCount === 1 ? 'ep' : 'eps'} · {row.seriesId}
                            </p>
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={draft.category}
                              onChange={(e) => updateDraft({ category: e.target.value })}
                              className="w-full min-h-[36px] px-2 rounded-lg bg-[#0D0D13] border border-white/[0.1] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                            >
                              {DRAMA_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                              {!DRAMA_CATEGORIES.includes(draft.category as (typeof DRAMA_CATEGORIES)[number]) && (
                                <option value={draft.category}>{draft.category}</option>
                              )}
                            </select>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-8 rounded overflow-hidden border border-white/10 bg-[#0D0D13] shrink-0">
                                <ResolvedThumb src={draft.thumbUrl} alt={draft.title} />
                              </div>
                              <input
                                type="text"
                                value={draft.thumbUrl}
                                onChange={(e) => updateDraft({ thumbUrl: e.target.value })}
                                placeholder="Cover URL"
                                className="w-24 min-h-[36px] px-2 rounded-lg bg-[#0D0D13] border border-white/[0.1] text-[11px] text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                              />
                              <label className="min-h-[36px] px-2 rounded-lg border border-[#D4AF37]/35 text-[#FCE7A2] hover:bg-[#D4AF37]/10 inline-flex items-center cursor-pointer shrink-0">
                                <Upload className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => void handleWsRowThumbUpload(row.seriesName, draft, e)}
                                  className="sr-only"
                                />
                              </label>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={draft.videoUrl}
                              onChange={(e) => updateDraft({ videoUrl: e.target.value })}
                              placeholder="https://youtu.be/..."
                              className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#0D0D13] border border-white/[0.1] text-[11px] text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={draft.description}
                              onChange={(e) => updateDraft({ description: e.target.value })}
                              placeholder="Episodes / description"
                              className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#0D0D13] border border-white/[0.1] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickAddEpisodeToSeries(row.seriesName)}
                                className="min-h-[34px] px-2.5 rounded-lg border border-[#D4AF37]/45 bg-[#17130A] text-[#FCE7A2] hover:bg-[#231D0F] font-semibold text-[11px] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Ep</span>
                              </button>
                              <button
                                type="button"
                                disabled={isRowSaving}
                                onClick={() => void handleWsSaveRow(row, draft)}
                                className="min-h-[34px] px-3 rounded-lg gold-gradient-bg text-[#181307] font-bold text-[11px] hover:brightness-105 disabled:opacity-60 cursor-pointer"
                              >
                                {isRowSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                disabled={deletingSectionName === row.seriesName}
                                onClick={() => void handleConfirmDeleteSection(row.seriesName)}
                                aria-label={`Delete series row ${row.seriesName}`}
                                className="min-h-[34px] px-2.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-950/40 inline-flex items-center cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 1. Create Episode Sections / Categories */}
            <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-lg font-display font-bold text-[#F6F2E9]">
                  Episode Sections &amp; Categories ({existingSeriesList.length})
                </h2>
              </div>
              <p className="text-xs text-[#A69F91]">
                Create new drama sections manually, then add extra individual episodes into any section below.
              </p>

              <form onSubmit={handleCreateSectionSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={newSectionInput}
                  onChange={(e) => setNewSectionInput(e.target.value)}
                  placeholder="e.g. Royal Betrayal [Season 2]"
                  className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/30 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 hover:brightness-105 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Section / Series</span>
                </button>
              </form>

              <div className="space-y-2">
                {existingSeriesList.map((sec) => {
                  const secId = toSeriesId(sec);
                  const count = episodes.filter((ep) => getEpisodeSeriesId(ep) === secId).length;
                  const isRenaming = renamingSection === sec;
                  const isConfirmingDelete = confirmDeleteSection === sec;
                  const isSelected = seriesSelect === sec;

                  return (
                    <div
                      key={sec}
                      className={`rounded-xl bg-[#09090D] border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
                        isSelected ? 'border-[#D4AF37]/65' : 'border-white/[0.1]'
                      }`}
                    >
                      {isRenaming ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                          <input
                            type="text"
                            maxLength={60}
                            value={renameSectionValue}
                            onChange={(e) => setRenameSectionValue(e.target.value)}
                            className="flex-1 min-w-[160px] min-h-[36px] px-3 rounded-lg bg-[#070709] border border-[#D4AF37]/50 text-xs text-[#F6F2E9] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleConfirmRenameSection(sec)}
                            className="min-h-[36px] px-3 rounded-lg gold-gradient-bg text-[#181307] font-bold"
                          >
                            Save Name
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingSection(null)}
                            className="min-h-[36px] px-3 rounded-lg border border-white/10 text-[#A69F91]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSelectSeriesInForm(sec)}
                            className="flex items-center gap-2 min-w-0 text-left hover:text-[#FCE7A2]"
                          >
                            <span className="font-semibold text-[#F6F2E9] truncate">{sec}</span>
                            <span className="font-mono-num text-[#E8C96D] shrink-0">
                              ({count} {count === 1 ? 'ep' : 'eps'})
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#181307] gold-gradient-bg px-1.5 py-0.5 rounded">
                                Selected
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingSection(sec);
                                setRenameSectionValue(sec);
                                setConfirmDeleteSection(null);
                              }}
                              aria-label={`Rename section ${sec}`}
                              className="min-h-[34px] px-2.5 rounded-lg border border-[#D4AF37]/30 text-[#E8C96D] hover:bg-[#D4AF37]/10 inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>

                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleConfirmDeleteSection(sec)}
                                  className="min-h-[34px] px-2.5 rounded-lg bg-red-600 text-white font-bold"
                                >
                                  Confirm Delete{count > 0 ? ` (+${count} eps)` : ''}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSection(null)}
                                  className="min-h-[34px] px-2 rounded-lg border border-white/10 text-[#A69F91]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (count === 0) {
                                    void handleConfirmDeleteSection(sec);
                                  } else {
                                    setConfirmDeleteSection(sec);
                                  }
                                }}
                                aria-label={`Delete section ${sec}`}
                                className="min-h-[34px] px-2.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-950/40 inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Add / Edit / Upload Episodes */}
            <section
              ref={episodeFormRef}
              className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-lg font-display font-bold text-[#F6F2E9]">
                    {editingEpisodeId
                      ? 'Edit Episode'
                      : `Manage Episodes (${episodes.length})`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={restoringDefaults}
                    onClick={() => void handleRestoreDefaults()}
                    className="min-h-[38px] px-3 rounded-lg border border-red-500/35 text-red-200 hover:bg-red-950/35 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {restoringDefaults ? 'Clearing...' : 'Reset Catalog'}
                    </span>
                  </button>
                  {editingEpisodeId && (
                    <button
                      type="button"
                      onClick={() => resetEpisodeForm()}
                      className="text-xs font-medium text-[#A69F91] hover:text-[#F6F2E9]"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmitEpisode} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Step 1: Choose Target Series & Category First */}
                <div className="sm:col-span-2 rounded-xl bg-[#0D0B07] border border-[#D4AF37]/35 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="ep-series-select"
                        className="text-xs font-semibold text-[#FCE7A2]"
                      >
                        1. Select Existing Series (or Create New)
                      </label>
                      <select
                        id="ep-series-select"
                        value={seriesSelect}
                        onChange={(e) => handleSelectSeriesInForm(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/40 text-sm font-medium text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                      >
                        {existingSeriesCatalog.map((item) => (
                          <option key={item.seriesId} value={item.seriesName}>
                            {item.seriesName} ({item.episodeCount}{' '}
                            {item.episodeCount === 1 ? 'ep' : 'eps'} · {item.category})
                          </option>
                        ))}
                        <option value={NEW_SERIES_OPTION}>+ Create a new series...</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="ep-category-select"
                        className="text-xs font-semibold text-[#FCE7A2]"
                      >
                        2. Genre / Category Row
                      </label>
                      <select
                        id="ep-category-select"
                        value={epCategory}
                        onChange={(e) => {
                          setEpCategory(e.target.value);
                          setEpCategoryManual(true);
                        }}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/30 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                      >
                        {DRAMA_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {!DRAMA_CATEGORIES.includes(epCategory as (typeof DRAMA_CATEGORIES)[number]) && (
                          <option value={epCategory}>{epCategory}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {seriesSelect === NEW_SERIES_OPTION ? (
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#E8C96D]">New Series Name *</label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={customSeriesName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomSeriesName(val);
                          if (!epCategoryManual) {
                            setEpCategory(inferEpisodeCategory(val, epTitle));
                          }
                        }}
                        placeholder="e.g. Midnight Vows"
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/40 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  ) : selectedCatalogSeries ? (
                    <div className="rounded-lg bg-[#070709]/85 border border-white/[0.08] p-3 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[#F6F2E9] font-medium truncate">
                            Selected Series:{' '}
                            <span className="text-[#FCE7A2] font-semibold">
                              {selectedCatalogSeries.seriesName}
                            </span>{' '}
                            <span className="text-[10px] font-mono-num text-[#8D867A]">
                              ({selectedCatalogSeries.episodes.length}{' '}
                              {selectedCatalogSeries.episodes.length === 1 ? 'ep' : 'eps'})
                            </span>
                          </p>
                          <p className="text-[11px] text-[#A69F91]">
                            {selectedCatalogSeries.episodes.length > 0
                              ? 'Manage or remove individual episodes below without deleting the whole series.'
                              : 'No episodes yet — publish Episode 1 below.'}
                          </p>
                        </div>
                        {!editingEpisodeId && (
                          <span className="px-2.5 py-1 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 font-mono-num text-[11px] font-bold text-[#FCE7A2] shrink-0">
                            Next: {selectedCatalogSeries.nextEpLabel}
                          </span>
                        )}
                      </div>

                      {selectedCatalogSeries.episodes.length > 0 && (
                        <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#0B0B10]">
                          {selectedCatalogSeries.episodes.map((ep) => {
                            const thumb = resolveEpisodeCover(ep);
                            const rawVid = (ep.videoUrl || ep.youtubeUrl || '').trim();
                            const isDeletingThis = deletingEpisodeId === ep.id;
                            return (
                              <div
                                key={ep.id}
                                className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 hover:bg-white/[0.02]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-12 h-8 rounded overflow-hidden border border-white/10 shrink-0 bg-[#070709]">
                                    <ResolvedThumb src={thumb} alt={ep.title} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#F6F2E9] truncate">
                                      <span className="font-mono-num text-[#FCE7A2] mr-1.5">
                                        {ep.episodeLabel}
                                      </span>
                                      {ep.title}
                                    </p>
                                    <p className="text-[10px] font-mono-num text-[#8D867A] truncate">
                                      {rawVid || 'No video URL'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditEpisode(ep)}
                                    className="min-h-[32px] px-2.5 rounded-lg border border-[#D4AF37]/30 text-[#E8C96D] hover:bg-[#D4AF37]/10 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDeletingThis}
                                    onClick={() => void handleDeleteEpisodeClick(ep)}
                                    aria-label={`Delete episode ${ep.episodeLabel} ${ep.title}`}
                                    className="min-h-[32px] px-2.5 rounded-lg bg-red-600/20 border border-red-500/50 text-red-200 hover:bg-red-600 hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>{isDeletingThis ? 'Deleting...' : 'Delete'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Video URL OR Local Video Upload */}
                <div className="sm:col-span-2 rounded-xl bg-[#09090D] border border-white/[0.08] p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="ep-video-url"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8C96D]"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Episode Video (YouTube Video/Playlist, MP4 URL, or Upload)</span>
                    </label>
                    {extractedPlaylistId ? (
                      <span className="font-mono-num text-[11px] font-semibold text-[#FCE7A2]">
                        YouTube Playlist Ready
                      </span>
                    ) : extractedVideoId ? (
                      <span className="font-mono-num text-[11px] text-[#FCE7A2]">
                        YouTube ID: {extractedVideoId}
                      </span>
                    ) : epVideoUrl.startsWith('idb://') ? (
                      <span className="font-mono-num text-[11px] text-[#FCE7A2]">
                        Uploaded Video Ready
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="ep-video-url"
                      type="text"
                      value={epVideoUrl}
                      onChange={(e) => setEpVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://youtu.be/... or .mp4"
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <label className="min-h-[44px] px-4 rounded-xl border border-[#D4AF37]/45 bg-[#15120A] text-[#FCE7A2] hover:bg-[#1F1A0D] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingVideo ? 'Uploading...' : 'Upload Video'}</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => void handleVideoUpload(e)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* Thumbnail URL OR Local Image Upload + Live Preview */}
                <div className="sm:col-span-2 rounded-xl bg-[#09090D] border border-white/[0.08] p-4 space-y-2.5">
                  <label
                    htmlFor="ep-cover-url"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8C96D]"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Episode Thumbnail (Custom Image URL or Upload Thumbnail)</span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <input
                      id="ep-cover-url"
                      type="text"
                      value={epCoverUrl}
                      onChange={(e) => setEpCoverUrl(e.target.value)}
                      placeholder="https://... image URL (or leave blank for YouTube thumbnail)"
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <label className="min-h-[44px] px-4 rounded-xl border border-[#D4AF37]/45 bg-[#15120A] text-[#FCE7A2] hover:bg-[#1F1A0D] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingThumb ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleThumbUpload(e)}
                        className="sr-only"
                      />
                    </label>
                    <div className="w-28 h-16 rounded-lg overflow-hidden border border-[#D4AF37]/30 bg-[#070709] shrink-0">
                      <ResolvedThumb src={previewThumb} alt="Episode thumbnail preview" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A69F91]">Episode Number</label>
                  <input
                    type="text"
                    required
                    value={epLabel}
                    onChange={(e) => setEpLabel(e.target.value)}
                    placeholder="EP 02"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm font-mono-num text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A69F91]">Episode Title (optional)</label>
                  <input
                    type="text"
                    value={epTitle}
                    onChange={(e) => setEpTitle(e.target.value)}
                    placeholder={`e.g. ${selectedCatalogSeries?.nextEpLabel || 'EP 01'} — Secret Witness`}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Coin Reward</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={5000}
                      value={epReward}
                      onChange={(e) => setEpReward(e.target.value)}
                      placeholder="100"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm text-[#F6F2E9] font-mono-num focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A69F91]">Duration</label>
                    <input
                      type="text"
                      value={epDuration}
                      onChange={(e) => setEpDuration(e.target.value)}
                      placeholder="Watch 30s+"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label htmlFor="ep-start-time" className="text-[11px] text-[#A69F91]">
                      Start At (seconds)
                    </label>
                    <input
                      id="ep-start-time"
                      type="number"
                      min={0}
                      max={86400}
                      value={epStartTime}
                      onChange={(e) => setEpStartTime(e.target.value)}
                      placeholder="28"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm font-mono-num text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#A69F91]">
                      Optional Sponsor URL override
                    </label>
                    <input
                      type="text"
                      value={epSponsorUrl}
                      onChange={(e) => setEpSponsorUrl(e.target.value)}
                      placeholder="Leave blank to use global Sponsor Ad URL"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-[#A69F91]">Short Synopsis</label>
                  <input
                    type="text"
                    value={epSynopsis}
                    onChange={(e) => setEpSynopsis(e.target.value)}
                    placeholder="Brief dramatic hook for viewers"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Instant Visual Preview Before Publishing (Thumbnail + Playable Video) */}
                <div className="sm:col-span-2 rounded-xl bg-[#09090D] border border-[#D4AF37]/25 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#FCE7A2]">
                      Live Episode Media Preview (Before Publishing)
                    </span>
                    <span className="text-[11px] font-mono-num text-[#E8C96D]">
                      {resolvedSeriesName || 'Select Section'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-[#A69F91]">Thumbnail Preview</p>
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/[0.1] bg-[#070709]">
                        <ResolvedThumb src={previewThumb} alt={epTitle || 'Thumbnail Preview'} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-[#A69F91]">Video Player Preview</p>
                      <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/[0.1] bg-black">
                        <AdminVideoPreview videoUrl={epVideoUrl} title={epTitle} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingEp || uploadingThumb || uploadingVideo}
                  className="sm:col-span-2 min-h-[48px] px-4 rounded-xl gold-gradient-bg text-[#181307] font-bold text-sm inline-flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-60 cursor-pointer"
                >
                  {editingEpisodeId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {savingEp
                      ? 'Saving...'
                      : editingEpisodeId
                        ? 'Save Episode Changes'
                        : '+ Publish Episode'}
                  </span>
                </button>
              </form>

              {/* Published Episodes List (with inline Thumbnail + Video verification preview) */}
              <div className="divide-y divide-white/[0.06] border-t border-white/[0.08]">
                {episodes.map((ep) => {
                  const thumb = resolveEpisodeCover(ep);
                  const rawVid = (ep.videoUrl || ep.youtubeUrl || '').trim();
                  const vidKind = extractYouTubePlaylistId(rawVid)
                    ? 'YouTube Playlist'
                    : extractYouTubeId(rawVid)
                      ? 'YouTube Video'
                      : rawVid.startsWith('idb://')
                        ? 'Uploaded Video'
                        : rawVid
                          ? 'Direct Video'
                          : 'No Video';
                  const isPreviewOpen = previewPublishedId === ep.id;

                  return (
                    <div key={ep.id} className="py-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-[#08080B]">
                            <ResolvedThumb src={thumb} alt={ep.title} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F6F2E9] truncate">
                              {ep.title}
                            </p>
                            <p className="text-xs text-[#8D867A] truncate">
                              {ep.series} · {inferEpisodeCategory(ep.series, ep.title, ep.category)} · {ep.episodeLabel} · +{ep.rewardCoins} Coins · {vidKind}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPublishedId(isPreviewOpen ? null : ep.id)
                            }
                            className="min-h-[38px] px-3 rounded-lg border border-white/[0.14] text-[#FCE7A2] hover:border-[#D4AF37]/50 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>{isPreviewOpen ? 'Hide Preview' : 'Preview'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditEpisode(ep)}
                            aria-label={`Edit ${ep.title}`}
                            className="min-h-[38px] px-3 rounded-lg border border-[#D4AF37]/30 text-[#E8C96D] hover:bg-[#D4AF37]/10 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingEpisodeId === ep.id}
                            onClick={() => void handleDeleteEpisodeClick(ep)}
                            aria-label={`Delete ${ep.title}`}
                            className="min-h-[38px] px-3 rounded-lg border border-red-500/25 text-red-300 hover:bg-red-950/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingEpisodeId === ep.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>

                      {isPreviewOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl bg-[#09090D] border border-[#D4AF37]/25 p-3">
                          <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
                            <ResolvedThumb src={thumb} alt={ep.title} />
                          </div>
                          <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                            <AdminVideoPreview videoUrl={rawVid} title={ep.title} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Sponsor URL & Embedded Ad Slot */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="obsidian-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-base font-display font-bold text-[#F6F2E9]">
                    Sponsor Ad URL
                  </h2>
                </div>
                <form onSubmit={handleSaveSponsorUrl} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    required
                    value={sponsorUrlInput}
                    onChange={(e) => setSponsorUrlInput(e.target.value)}
                    placeholder="https://directyp.org"
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    disabled={savingUrl}
                    className="min-h-[44px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 hover:brightness-105 disabled:opacity-60"
                  >
                    {savingUrl ? 'Saving...' : 'Update URL'}
                  </button>
                </form>
              </div>

              <div className="obsidian-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-base font-display font-bold text-[#F6F2E9]">
                    Extra Embedded Ad HTML
                  </h2>
                </div>
                <form onSubmit={handleSaveEmbeddedAd} className="space-y-2.5">
                  <textarea
                    rows={2}
                    maxLength={8000}
                    value={embeddedAdInput}
                    onChange={(e) => setEmbeddedAdInput(e.target.value)}
                    placeholder='<script src="https://..."></script> or HTML ad banner markup'
                    className="w-full p-3 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-xs font-mono text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEmbeddedAdInput(DEFAULT_REAL_AD_SCRIPT)}
                      className="min-h-[38px] px-3 rounded-xl border border-[#D4AF37]/35 text-xs font-medium text-[#FCE7A2] hover:bg-[#D4AF37]/10"
                    >
                      Use Default 320x50 Script
                    </button>
                    {embeddedAdInput && (
                      <button
                        type="button"
                        onClick={() => setEmbeddedAdInput('')}
                        className="min-h-[38px] px-3 rounded-xl border border-white/[0.1] text-xs text-[#A69F91] hover:text-[#F6F2E9]"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={savingEmbed}
                      className="min-h-[38px] px-4 rounded-xl gold-gradient-bg text-[#181307] font-semibold text-xs hover:brightness-105 disabled:opacity-60"
                    >
                      {savingEmbed ? 'Saving...' : 'Save Embed'}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* 4. Mystery Vault R3 Progress Bar Boost, 11-Ad Reset, Ticker & Sunday Pool Controls */}
            <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]">
                    Secret Mystery Vault R{R3_BOOST_ZAR} Boost ({R3_MYSTERY_CYCLE_ADS}-Ad Reset) &amp; Sunday Pool Controls
                  </h2>
                </div>
                <span className="text-[11px] font-mono-num text-[#E8C96D]">
                  Auto-resets after {R3_MYSTERY_CYCLE_ADS}th ad · Gmail: {ADMIN_NOTIFICATION_EMAIL}
                </span>
              </div>

              <form
                onSubmit={handleSaveVaultAndRollover}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="admin-r5-winner-username"
                    className="text-[11px] font-semibold text-[#E8C96D]"
                  >
                    Set R{R3_BOOST_ZAR} Progress Bar Boost Winner (Player Username)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="admin-r5-winner-username"
                      type="text"
                      list="admin-player-usernames"
                      maxLength={32}
                      value={r5WinnerUsernameInput}
                      onChange={(e) => setR5WinnerUsernameInput(e.target.value)}
                      placeholder="Leave blank for 11-ad auto-reset cycle, or enter Username"
                      className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/30 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <datalist id="admin-player-usernames">
                      {players.map((p) => (
                        <option key={p.uid} value={p.username} />
                      ))}
                    </datalist>
                    {r5WinnerUsernameInput && (
                      <button
                        type="button"
                        onClick={() => setR5WinnerUsernameInput('')}
                        className="min-h-[42px] px-3 rounded-xl border border-white/[0.1] text-xs text-[#A69F91] hover:text-[#F6F2E9]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-[#070709] border border-white/[0.08] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#F6F2E9]">
                      Next Pick Wins R{R3_BOOST_ZAR} Progress Bar Boost
                    </p>
                    <p className="text-[11px] text-[#8D867A]">
                      Toggle ON so the very next Mystery Box pick triggers the R{R3_BOOST_ZAR} Progress Bar Boost (+1,000 Coins &amp; +R{R3_BOOST_ZAR} Pool) celebration popup.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={nextPickWinsR5Input}
                    onClick={() => setNextPickWinsR5Input((v) => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      nextPickWinsR5Input
                        ? 'bg-[#D4AF37] border-[#FCE7A2]'
                        : 'bg-[#17171D] border-white/15'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                        nextPickWinsR5Input
                          ? 'translate-x-6 bg-[#181307]'
                          : 'translate-x-1 bg-[#8D867A]'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#A69F91]">Sunday Prize Pool (R)</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={poolPrizeInput}
                    onChange={(e) => setPoolPrizeInput(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm font-mono-num text-[#F6F2E9]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A69F91]">Rollover From Last Week (R)</label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={rolloverInput}
                    onChange={(e) => setRolloverInput(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#070709] border border-[#D4AF37]/25 text-sm font-mono-num text-[#F6F2E9]"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingVaultConfig}
                    className="min-h-[40px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs font-bold hover:brightness-105 disabled:opacity-60"
                  >
                    Save R{R3_BOOST_ZAR} Boost &amp; Pool Settings
                  </button>
                  <button
                    type="button"
                    disabled={savingVaultConfig}
                    onClick={() => void handleForceSundayResetNow()}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#2A1F0B] border border-[#FCE7A2]/60 text-[#FCE7A2] hover:bg-[#3A2B0E] text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Force Sunday Reset Now</span>
                  </button>
                  <button
                    type="button"
                    disabled={savingVaultConfig}
                    onClick={() => void handleQuickTestRollover()}
                    className="min-h-[40px] px-3.5 rounded-xl border border-[#D4AF37]/35 text-[#E8C96D] hover:bg-[#D4AF37]/10 text-xs font-semibold"
                  >
                    Trigger Test Rollover (+R50)
                  </button>
                  <button
                    type="button"
                    disabled={savingVaultConfig}
                    onClick={() => void handleResetPoolBase()}
                    className="min-h-[40px] px-3.5 rounded-xl border border-white/[0.12] text-[#A69F91] hover:text-[#F6F2E9] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Pool to R50</span>
                  </button>
                </div>
              </form>

              <form
                onSubmit={handleSaveLiveTicker}
                className="pt-3 border-t border-white/[0.08] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#E8C96D]">
                      Live &ldquo;Recent Winners&rdquo; Ticker
                    </p>
                    <p className="text-[11px] text-[#8D867A]">
                      Toggle or customize displayed winner names on the Home screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={tickerEnabledInput}
                    onClick={() => setTickerEnabledInput((v) => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                      tickerEnabledInput
                        ? 'bg-[#D4AF37] border-[#FCE7A2]'
                        : 'bg-[#17171D] border-white/15'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                        tickerEnabledInput
                          ? 'translate-x-6 bg-[#181307]'
                          : 'translate-x-1 bg-[#8D867A]'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={tickerNamesInput}
                    onChange={(e) => setTickerNamesInput(e.target.value)}
                    placeholder="Thabo_M, Lerato_K, Sipho_ZN, Zanele_99"
                    className="flex-1 min-h-[40px] px-3.5 rounded-xl bg-[#070709] border border-white/[0.1] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    disabled={savingTicker}
                    className="min-h-[40px] px-4 rounded-xl border border-[#D4AF37]/40 text-[#FCE7A2] hover:bg-[#D4AF37]/10 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                  >
                    {savingTicker ? 'Saving...' : 'Save Ticker'}
                  </button>
                </div>
              </form>

              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <p className="text-xs font-semibold text-[#E8C96D]">
                  R{R3_BOOST_ZAR} Progress Bar Boost Winners Log ({mysteryWinners.length})
                </p>
                {mysteryWinners.length === 0 ? (
                  <p className="text-xs text-[#8D867A]">
                    No R{R3_BOOST_ZAR} Progress Bar Boost Mystery Vault winners recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.06] max-h-44 overflow-y-auto">
                    {mysteryWinners.map((w) => (
                      <div
                        key={w.id}
                        className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[#F6F2E9]">{w.username}</span>
                          <span className="text-[#8D867A]"> · {w.contact}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono-num shrink-0">
                          <span className="text-[#E8C96D] font-bold">{w.voucherCode}</span>
                          <span className="text-[#8D867A]">
                            {w.createdAt?.toDate
                              ? w.createdAt.toDate().toLocaleDateString()
                              : w.createdAtMs
                                ? new Date(w.createdAtMs).toLocaleDateString()
                                : 'Just now'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#E8C96D]">
                    Prize Wins &amp; Sunday Pool Payouts (`prize_wins`: {prizeWins.length})
                  </p>
                  <span className="text-[11px] text-[#8D867A] inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#D4AF37]" />
                    <span>Auto-emails {ADMIN_NOTIFICATION_EMAIL}</span>
                  </span>
                </div>
                {prizeWins.length === 0 ? (
                  <p className="text-xs text-[#8D867A]">
                    No Sunday Pool or Mystery R{R3_BOOST_ZAR} Boost prize wins recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.06] max-h-52 overflow-y-auto">
                    {prizeWins.map((win) => (
                      <div
                        key={win.id}
                        className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#F6F2E9] truncate">
                            {win.username}{' '}
                            <span className="text-[11px] font-normal text-[#A69F91]">
                              · {win.summary}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#8D867A] font-mono-num">
                            {win.prizeType} {win.voucherCode ? `· ${win.voucherCode}` : ''}{' '}
                            {win.contact ? `· ${win.contact}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 font-mono-num shrink-0">
                          {win.amountZar > 0 && (
                            <span className="px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#FCE7A2] font-bold">
                              R{win.amountZar}
                            </span>
                          )}
                          {win.coinsAwarded > 0 && (
                            <span className="text-[#E8C96D]">
                              +{win.coinsAwarded.toLocaleString()} Coins
                            </span>
                          )}
                          <span className="text-[#8D867A]">
                            {win.createdAt?.toDate
                              ? win.createdAt.toDate().toLocaleDateString()
                              : win.createdAtMs
                                ? new Date(win.createdAtMs).toLocaleDateString()
                                : 'Just now'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 4B. Support Messages & Claim Prize Help Queue */}
            <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                    <h2 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]">
                      Support Messages &amp; Claim Prize Help ({supportMessages.length})
                    </h2>
                  </div>
                  <p className="text-xs text-[#8D867A]">
                    Click any ticket card below to expand and read the full message, view player Email/WhatsApp, and mark resolved.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['open', 'resolved', 'all'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSupportFilter(tab)}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                        supportFilter === tab
                          ? 'gold-gradient-bg text-[#181307]'
                          : 'bg-[#09090D] border border-white/[0.1] text-[#A69F91] hover:text-[#F6F2E9]'
                      }`}
                    >
                      {tab === 'open'
                        ? `Open (${openSupportCount})`
                        : tab === 'resolved'
                          ? `Resolved (${resolvedSupportCount})`
                          : `All (${supportMessages.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {visibleSupportMessages.length === 0 ? (
                <div className="rounded-xl bg-[#09090D] border border-white/[0.08] p-4 text-xs text-[#8D867A]">
                  No {supportFilter === 'all' ? '' : `${supportFilter} `}support messages right now.
                </div>
              ) : (
                <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                  {visibleSupportMessages.map((msg) => {
                    const isResolved = msg.status === 'resolved';
                    const isBusy = resolvingMessageId === msg.id;
                    const isExpanded = Boolean(expandedSupportIds[msg.id]);
                    const noteValue =
                      supportNoteDrafts[msg.id] !== undefined
                        ? supportNoteDrafts[msg.id]
                        : msg.adminNote || '';
                    const dateLabel = msg.createdAt?.toDate
                      ? msg.createdAt.toDate().toLocaleString()
                      : msg.createdAtMs
                        ? new Date(msg.createdAtMs).toLocaleString()
                        : 'Just now';

                    const toggleCard = () => {
                      setExpandedSupportIds((prev) => ({
                        ...prev,
                        [msg.id]: !prev[msg.id],
                      }));
                    };

                    return (
                      <div
                        key={msg.id}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={toggleCard}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCard();
                          }
                        }}
                        className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-colors ${
                          isResolved
                            ? 'bg-[#0A0F0B] border-emerald-500/25 hover:border-emerald-500/45'
                            : 'bg-[#09090D] border-[#D4AF37]/30 hover:border-[#D4AF37]/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isResolved
                                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                    : 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                                }`}
                              >
                                {isResolved ? 'Resolved' : 'Open'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-semibold uppercase text-[#E8C96D]">
                                {msg.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] font-mono-num text-[#8D867A]">
                                {msg.source === 'local' ? 'Local Storage' : 'Firebase Cloud'}
                              </span>
                              <span className="text-[11px] text-[#8D867A]">· {dateLabel}</span>
                            </div>
                            <h3 className="text-sm font-bold text-[#F6F2E9]">{msg.subject}</h3>
                            <p className="text-xs text-[#BFB7A6]">
                              Player: <strong className="text-[#FCE7A2]">{msg.username}</strong> ·{' '}
                              Email/WhatsApp:{' '}
                              <span className="font-mono-num text-[#F6F2E9]">{msg.contact}</span>
                            </p>
                            {!isExpanded && (
                              <p className="text-xs text-[#8D867A] truncate pt-0.5">
                                {msg.message}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {onResolveSupportMessage && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleToggleResolveSupport(
                                    msg,
                                    isResolved ? 'open' : 'resolved'
                                  );
                                }}
                                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 ${
                                  isResolved
                                    ? 'border border-white/15 text-[#C4BDB0] hover:bg-white/[0.06]'
                                    : 'gold-gradient-bg text-[#181307] hover:brightness-105'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {isBusy
                                    ? 'Updating...'
                                    : isResolved
                                      ? 'Reopen Ticket'
                                      : 'Mark Resolved'}
                                </span>
                              </button>
                            )}
                            <span
                              aria-hidden="true"
                              className="p-1.5 rounded-lg border border-white/10 text-[#A69F91]"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="space-y-3 pt-2 border-t border-white/[0.08] cursor-default"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-[#070709] border border-white/[0.06] p-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-[#8D867A] block">
                                  Player Name
                                </span>
                                <span className="font-semibold text-[#FCE7A2]">{msg.username}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-[#8D867A] block">
                                  Email / WhatsApp
                                </span>
                                <span className="font-mono-num text-[#F6F2E9] select-all">
                                  {msg.contact}
                                </span>
                              </div>
                            </div>

                            <div className="bg-[#070709] border border-white/[0.06] rounded-lg p-3 space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-[#8D867A] block">
                                Full Message
                              </span>
                              <p className="text-xs sm:text-sm text-[#E5DFD2] whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                maxLength={500}
                                value={noteValue}
                                onChange={(e) =>
                                  setSupportNoteDrafts((prev) => ({
                                    ...prev,
                                    [msg.id]: e.target.value,
                                  }))
                                }
                                placeholder="Optional admin resolution note (saved on resolve/update)"
                                className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#070709] border border-white/[0.1] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                              />
                              {onResolveSupportMessage && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleToggleResolveSupport(msg, msg.status)}
                                  className="min-h-[38px] px-3 rounded-lg border border-[#D4AF37]/35 text-[#FCE7A2] hover:bg-[#D4AF37]/10 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50"
                                >
                                  Save Note
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 5. Adjust Player Coin Balances */}
            <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  <h2 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]">
                    Adjust Player Coin Balances
                  </h2>
                </div>
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Filter players..."
                  className="min-h-[40px] px-3 rounded-xl bg-[#070709] border border-white/[0.1] text-xs text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="divide-y divide-white/[0.06]">
                {filteredPlayers.map((p) => {
                  const draft = editingCoins[p.uid] || {
                    coins: String(p.coins),
                    weekly: String(p.weeklyCoins),
                  };

                  return (
                    <div
                      key={p.uid}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F6F2E9] truncate">
                          {p.username}
                        </p>
                        <p className="font-mono-num text-xs text-[#8D867A]">
                          Total: {p.coins.toLocaleString()} · Weekly: {p.weeklyCoins.toLocaleString()} · Sunday Bonus: R{(p.sundayBonusZar || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-[11px] text-[#A69F91] flex items-center gap-1">
                          <span>Total</span>
                          <input
                            type="number"
                            min={0}
                            value={draft.coins}
                            onChange={(e) =>
                              setEditingCoins((prev) => ({
                                ...prev,
                                [p.uid]: { coins: e.target.value, weekly: draft.weekly },
                              }))
                            }
                            className="w-24 min-h-[38px] px-2.5 rounded-lg bg-[#070709] border border-white/[0.12] text-xs font-mono-num text-[#F6F2E9]"
                          />
                        </label>
                        <label className="text-[11px] text-[#A69F91] flex items-center gap-1">
                          <span>Weekly</span>
                          <input
                            type="number"
                            min={0}
                            value={draft.weekly}
                            onChange={(e) =>
                              setEditingCoins((prev) => ({
                                ...prev,
                                [p.uid]: { coins: draft.coins, weekly: e.target.value },
                              }))
                            }
                            className="w-24 min-h-[38px] px-2.5 rounded-lg bg-[#070709] border border-white/[0.12] text-xs font-mono-num text-[#F6F2E9]"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={savingPlayerId === p.uid}
                          onClick={async () => {
                            setSavingPlayerId(p.uid);
                            try {
                              await onAdjustPlayerCoins(
                                p,
                                Number(draft.coins) || 0,
                                Number(draft.weekly) || 0
                              );
                              setStatusMessage(`Updated coin balance for ${p.username}.`);
                            } finally {
                              setSavingPlayerId(null);
                            }
                          }}
                          className="min-h-[38px] px-3.5 rounded-lg gold-gradient-bg text-[#181307] text-xs font-semibold hover:brightness-105 disabled:opacity-60"
                        >
                          {savingPlayerId === p.uid ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
