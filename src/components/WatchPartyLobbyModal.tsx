import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Film,
  Flame,
  Globe,
  Link2,
  Lock,
  Play,
  Radio,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  WATCH_PARTY_PRIVATE_CAPACITY,
  WATCH_PARTY_PUBLIC_CAPACITY,
  buildWatchPartyInviteLink,
  resolveVideoSource,
} from '../constants';
import {
  checkWatchPartyUnlockAccess,
  ensureWatchPartyAuth,
  fetchWatchPartyRoom,
  getWatchPartyCapacity,
  normalizeRoomCode,
  subscribePublicWatchParties,
} from '../services/watchPartyService';
import { DramaEpisode, WatchPartyRoom } from '../types';
import {
  buildModernPlayerEpisode,
  fetchDailymotionShowsByGenre,
  getCachedDailymotionShowsByGenre,
  getModernCatalogByGenre,
  isEnglishCatalogTitle,
  searchDailymotionShows,
} from '../utils/modernCatalog';

interface WatchPartyLobbyModalProps {
  open: boolean;
  episodes: DramaEpisode[];
  initialEpisode?: DramaEpisode | null;
  activeRoom?: WatchPartyRoom | null;
  onCreateFreeRoom: (episode: DramaEpisode, isPublic: boolean) => Promise<WatchPartyRoom | null>;
  onEnterCreatedRoom: (room: WatchPartyRoom) => void;
  onRequestJoinRoom: (room: WatchPartyRoom) => void;
  onNotify?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
  onClose: () => void;
}

type LobbyModalTab = 'create' | 'join';

export const WatchPartyLobbyModal: React.FC<WatchPartyLobbyModalProps> = ({
  open,
  episodes,
  initialEpisode = null,
  activeRoom = null,
  onCreateFreeRoom,
  onEnterCreatedRoom,
  onRequestJoinRoom,
  onNotify,
  onClose,
}) => {
  const [modalTab, setModalTab] = useState<LobbyModalTab>('create');
  const [publicRooms, setPublicRooms] = useState<WatchPartyRoom[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [dailymotionEpisodes, setDailymotionEpisodes] = useState<DramaEpisode[]>(() => {
    const cached = getCachedDailymotionShowsByGenre('All') || [];
    return cached.map(buildModernPlayerEpisode);
  });
  const [searchResultEpisodes, setSearchResultEpisodes] = useState<DramaEpisode[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<WatchPartyRoom | null>(null);
  const [joining, setJoining] = useState(false);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCreatedRoom(null);
      setCreatingRoom(false);
      setCopiedType(null);
      setErrorMsg(null);
      return;
    }
    setErrorMsg(null);
    let active = true;
    let unsub: (() => void) | null = null;

    void ensureWatchPartyAuth()
      .then(() => {
        if (!active) return;
        unsub = subscribePublicWatchParties(
          (rooms) => setPublicRooms(rooms),
          () => setPublicRooms([])
        );
      })
      .catch(() => {
        if (active) setPublicRooms([]);
      });

    return () => {
      active = false;
      unsub?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (dailymotionEpisodes.length > 0) return;
    const controller = new AbortController();
    fetchDailymotionShowsByGenre('All', controller.signal)
      .then((shows) => {
        if (!controller.signal.aborted && shows.length > 0) {
          setDailymotionEpisodes(shows.map(buildModernPlayerEpisode));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, dailymotionEpisodes.length]);

  useEffect(() => {
    if (!open) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResultEpisodes([]);
      setSearchingCatalog(false);
      return;
    }

    const controller = new AbortController();
    setSearchingCatalog(true);
    const timer = window.setTimeout(() => {
      void searchDailymotionShows(trimmed, controller.signal)
        .then((shows) => {
          if (!controller.signal.aborted) {
            setSearchResultEpisodes(shows.map(buildModernPlayerEpisode));
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearchingCatalog(false);
          }
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, searchQuery]);

  const allPlayableEpisodes = useMemo(() => {
    const map = new Map<string, DramaEpisode>();
    const tryAdd = (ep: DramaEpisode | null | undefined) => {
      if (!ep?.id || map.has(ep.id)) return;
      if (!isEnglishCatalogTitle(ep.title)) return;
      const src = resolveVideoSource((ep.videoUrl || ep.youtubeUrl || '').trim());
      if (src.kind === 'empty') return;
      map.set(ep.id, ep);
    };

    tryAdd(initialEpisode);
    searchResultEpisodes.forEach(tryAdd);
    dailymotionEpisodes.forEach(tryAdd);
    episodes.forEach(tryAdd);
    getModernCatalogByGenre('All').map(buildModernPlayerEpisode).forEach(tryAdd);

    return Array.from(map.values());
  }, [initialEpisode, searchResultEpisodes, dailymotionEpisodes, episodes]);

  const filteredEpisodes = useMemo(() => {
    const cleanQ = searchQuery.trim().toLowerCase();
    if (!cleanQ) return allPlayableEpisodes.slice(0, 24);
    return allPlayableEpisodes
      .filter((ep) => {
        const hay = `${ep.title} ${ep.series} ${ep.category || ''} ${ep.episodeLabel}`.toLowerCase();
        return hay.includes(cleanQ);
      })
      .slice(0, 24);
  }, [allPlayableEpisodes, searchQuery]);

  useEffect(() => {
    if (!open) return;
    if (initialEpisode?.id && allPlayableEpisodes.some((ep) => ep.id === initialEpisode.id)) {
      setSelectedEpisodeId(initialEpisode.id);
    } else if (allPlayableEpisodes[0]?.id) {
      setSelectedEpisodeId((prev) =>
        prev && allPlayableEpisodes.some((ep) => ep.id === prev)
          ? prev
          : allPlayableEpisodes[0].id
      );
    }
  }, [open, initialEpisode, allPlayableEpisodes]);

  if (!open) return null;

  const selectedEpisode =
    allPlayableEpisodes.find((ep) => ep.id === selectedEpisodeId) ||
    filteredEpisodes[0] ||
    allPlayableEpisodes[0] ||
    null;

  const copyTextWithFeedback = async (value: string, type: 'code' | 'link', toastMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('Clipboard unavailable');
      }
      setCopiedType(type);
      onNotify?.(toastMsg, 'gold');
      window.setTimeout(() => setCopiedType(null), 2000);
    } catch {
      try {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.className = 'sr-only';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopiedType(type);
        onNotify?.(toastMsg, 'gold');
        window.setTimeout(() => setCopiedType(null), 2000);
      } catch {
        onNotify?.(`Room Code: ${value}`, 'neutral');
      }
    }
  };

  const handleHostLobbyClick = async () => {
    if (!selectedEpisode || creatingRoom) return;
    setErrorMsg(null);
    setCreatingRoom(true);
    try {
      const room = await onCreateFreeRoom(selectedEpisode, isPublicRoom);
      if (room) {
        setCreatedRoom(room);
      } else {
        setErrorMsg('Unable to create Watch Party room right now. Please try again.');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to create Watch Party room right now.'
      );
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinByCode = async (rawCode: string) => {
    let targetCode = rawCode.trim();
    if (/room=|lobby=|party=/i.test(targetCode)) {
      try {
        const parsed = new URL(targetCode);
        targetCode =
          parsed.searchParams.get('room') ||
          parsed.searchParams.get('lobby') ||
          parsed.searchParams.get('party') ||
          targetCode;
      } catch {
        const match = targetCode.match(/(?:room|lobby|party)=([a-zA-Z0-9_-]+)/i);
        if (match?.[1]) targetCode = match[1];
      }
    }
    const cleanCode = normalizeRoomCode(targetCode);
    if (cleanCode.length < 4) {
      setErrorMsg('Enter a valid Watch Party code (e.g. DW-4TRJJE).');
      return;
    }

    setJoining(true);
    setErrorMsg(null);
    try {
      const room = await fetchWatchPartyRoom(cleanCode);
      if (!room) {
        setErrorMsg(`Lobby "${cleanCode}" was not found or has already ended.`);
        return;
      }
      const access = await checkWatchPartyUnlockAccess(room);
      if (!access.hasAccess) {
        const capacity = getWatchPartyCapacity(room);
        const viewerCount = Math.max(1, room.viewerCount || 1);
        if (viewerCount >= capacity) {
          setErrorMsg(
            `Room Full (${viewerCount}/${capacity} watching). This Watch Lobby has reached maximum capacity.`
          );
          return;
        }
      }
      onRequestJoinRoom(room);
    } catch {
      setErrorMsg('Unable to look up that Watch Lobby right now.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Watch Party Lobby"
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl my-auto rounded-2xl bg-[#0D0D13] border border-[#D4AF37]/45 shadow-[0_24px_72px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08] bg-gradient-to-r from-[#1a1407] via-[#111118] to-[#0D0D13] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.45)]">
              <Users className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-bold text-white truncate">
                  Watch Party Lobby
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider shrink-0">
                  Free Host
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Host free rooms, invite friends &amp; watch uninterrupted in sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Watch Party lobby"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Tab Navigation ('Create' & 'Join') */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#0f0f16] border-b border-white/[0.06]">
          <div
            role="tablist"
            aria-label="Watch Party sections"
            className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/60 border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modalTab === 'create'}
              onClick={() => {
                setErrorMsg(null);
                setModalTab('create');
              }}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-black inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                modalTab === 'create'
                  ? 'gold-gradient-bg text-[#181307] shadow-[0_4px_16px_rgba(212,175,55,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Create</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modalTab === 'join'}
              onClick={() => {
                setErrorMsg(null);
                setModalTab('join');
              }}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-black inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                modalTab === 'join'
                  ? 'gold-gradient-bg text-[#181307] shadow-[0_4px_16px_rgba(212,175,55,0.35)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Join</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[72dvh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl bg-red-950/60 border border-red-500/50 px-3.5 py-2.5 text-xs font-semibold text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Active Room Banner (when already watching inside a room) */}
          {activeRoom && activeRoom.status === 'active' && !createdRoom && (
            <div className="rounded-2xl bg-gradient-to-br from-[#211807] to-[#121218] border border-[#D4AF37]/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#FCE7A2]">
                    Active Room: {activeRoom.roomId}
                  </span>
                </div>
                <span className="text-[11px] text-amber-200/80 truncate">
                  Host: {activeRoom.hostName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void copyTextWithFeedback(
                      buildWatchPartyInviteLink(activeRoom.roomId),
                      'link',
                      `Invite link copied! (?room=${activeRoom.roomId})`
                    )
                  }
                  className="flex-1 min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-[#D4AF37]/45 text-xs font-bold text-[#FCE7A2] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'link' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'link' ? 'Link Copied' : 'Copy Invite Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEnterCreatedRoom(activeRoom)}
                  className="min-h-[40px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs font-black cursor-pointer"
                >
                  Return to Room
                </button>
              </div>
            </div>
          )}

          {modalTab === 'create' ? (
            createdRoom ? (
              /* Instant Room Created! Card with Large Room Code, Copy Code, Copy Invite Link & Enter Room */
              <div className="rounded-2xl bg-gradient-to-b from-[#1e1708] via-[#13131b] to-[#0e0e14] border-2 border-[#D4AF37]/70 p-5 sm:p-6 text-center space-y-4 shadow-[0_0_40px_rgba(212,175,55,0.22)]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-xs font-black text-emerald-200 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Room Created!</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                    Share This Party Code
                  </p>
                  <div className="py-3 px-4 rounded-2xl bg-black/70 border border-[#D4AF37]/50 inline-block min-w-[220px]">
                    <p className="font-mono-num text-2xl sm:text-3xl font-black tracking-[0.2em] text-[#FCE7A2]">
                      {createdRoom.roomId}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 pt-1 line-clamp-1">
                    {createdRoom.isPublic ? 'Public Room (up to 25)' : 'Private Room (up to 8)'} ·{' '}
                    <strong className="text-white">{createdRoom.episodeTitle}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      void copyTextWithFeedback(
                        createdRoom.roomId,
                        'code',
                        `Room Code ${createdRoom.roomId} copied!`
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs sm:text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedType === 'code' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#FCE7A2]" />
                    )}
                    <span>{copiedType === 'code' ? 'Code Copied' : 'Copy Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void copyTextWithFeedback(
                        buildWatchPartyInviteLink(createdRoom.roomId),
                        'link',
                        `Invite link copied! (?room=${createdRoom.roomId})`
                      )
                    }
                    className="min-h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-[#D4AF37]/50 text-xs sm:text-sm font-bold text-[#FCE7A2] inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedType === 'link' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Link2 className="w-4 h-4 text-amber-300" />
                    )}
                    <span>{copiedType === 'link' ? 'Link Copied' : 'Copy Invite Link'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onEnterCreatedRoom(createdRoom)}
                  className="w-full min-h-[48px] px-5 rounded-xl gold-gradient-bg text-[#181307] text-sm sm:text-base font-black inline-flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(212,175,55,0.5)] hover:brightness-105 active:scale-[0.98] cursor-pointer transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Enter Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreatedRoom(null)}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 underline underline-offset-4 cursor-pointer"
                >
                  Create Another Room
                </button>
              </div>
            ) : (
              /* Create Tab: Public / Private + Movie Search & Picker + Free Create Button */
              <div className="rounded-2xl bg-[#13131b] border border-[#D4AF37]/30 p-3.5 sm:p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#FBBF24]" />
                    <h3 className="text-sm font-bold text-white">Host a Free Watch Party</h3>
                  </div>

                  {/* Public / Private Segmented Toggle */}
                  <div
                    role="group"
                    aria-label="Lobby visibility"
                    className="inline-flex items-center rounded-full bg-black/60 border border-white/10 p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(true)}
                      aria-pressed={isPublicRoom}
                      className={`min-h-[34px] px-3 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                        isPublicRoom
                          ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200'
                          : 'text-zinc-400 hover:text-white border border-transparent'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public ({WATCH_PARTY_PUBLIC_CAPACITY})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(false)}
                      aria-pressed={!isPublicRoom}
                      className={`min-h-[34px] px-3 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                        !isPublicRoom
                          ? 'bg-amber-400/20 border border-amber-400/50 text-[#FCE7A2]'
                          : 'text-zinc-400 hover:text-white border border-transparent'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private ({WATCH_PARTY_PRIVATE_CAPACITY})</span>
                    </button>
                  </div>
                </div>

                {/* Search Movie / Episode Input + Poster Thumbnail Picker */}
                <div className="space-y-2">
                  <label
                    htmlFor="watch-party-movie-search"
                    className="block text-[11px] font-semibold text-zinc-400"
                  >
                    Pick Movie / Episode ({isPublicRoom ? 'Visible in Live Public Lobbies' : 'Invite Code Only'})
                  </label>
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-amber-400/80 absolute left-3 pointer-events-none" />
                    <input
                      id="watch-party-movie-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search drama, horror, romance, English anime..."
                      className="w-full min-h-[44px] pl-9 pr-9 rounded-xl bg-black/65 border border-white/15 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {searchingCatalog && filteredEpisodes.length === 0 ? (
                      <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center text-xs text-zinc-400">
                        Searching English HD catalog...
                      </div>
                    ) : filteredEpisodes.length === 0 ? (
                      <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center text-xs text-zinc-400">
                        No matching English movies found for &ldquo;{searchQuery}&rdquo;.
                      </div>
                    ) : (
                      filteredEpisodes.map((ep) => {
                        const isSelected = selectedEpisode?.id === ep.id;
                        const poster = ep.coverImage || ep.posterUrl || ep.thumbnailUrl || '';
                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => setSelectedEpisodeId(ep.id)}
                            className={`w-full text-left rounded-xl p-2 border flex items-center justify-between gap-3 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#241a07]/90 border-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.22)]'
                                : 'bg-black/45 border-white/10 hover:border-[#D4AF37]/45'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#14141d] border border-white/10 shrink-0">
                                {poster ? (
                                  <img
                                    src={poster}
                                    alt={ep.title}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Film className="w-4 h-4 text-amber-400" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-bold uppercase text-amber-300">
                                    {ep.category || 'Drama'}
                                  </span>
                                  <span className="font-mono-num text-[10px] text-zinc-400">
                                    {ep.episodeLabel}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                                  {ep.title}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'gold-gradient-bg border-amber-200 text-[#181307]'
                                  : 'border-white/20 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedEpisode || creatingRoom}
                  onClick={() => void handleHostLobbyClick()}
                  className="w-full min-h-[48px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(212,175,55,0.4)] hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{creatingRoom ? 'Creating Room...' : 'Create Watch Party Room (Free)'}</span>
                </button>
              </div>
            )
          ) : (
            /* Join Tab: Centered ENTER PARTY CODE + Join Room + Live Public Lobbies */
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#13131b] border border-[#D4AF37]/35 p-4 sm:p-5 text-center space-y-3">
                <label
                  htmlFor="watch-party-code-input"
                  className="block text-xs font-black text-[#FCE7A2] uppercase tracking-[0.18em]"
                >
                  ENTER PARTY CODE
                </label>

                <input
                  id="watch-party-code-input"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleJoinByCode(joinCodeInput);
                    }
                  }}
                  placeholder="DW-4TRJJE"
                  className="w-full max-w-xs mx-auto block min-h-[48px] px-4 rounded-xl bg-black/70 border border-[#D4AF37]/45 text-center font-mono-num text-base sm:text-lg font-black tracking-widest text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FBBF24]"
                />

                <button
                  type="button"
                  disabled={joining || !joinCodeInput.trim()}
                  onClick={() => void handleJoinByCode(joinCodeInput)}
                  className="w-full max-w-xs mx-auto min-h-[46px] px-6 rounded-xl gold-gradient-bg text-[#181307] text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(212,175,55,0.38)] hover:brightness-105 disabled:opacity-50 cursor-pointer transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{joining ? 'Joining...' : 'Join Room'}</span>
                </button>
              </div>

              {/* Live Public Lobbies List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      Live Public Lobbies ({publicRooms.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-zinc-400">Real-time Firebase Sync</span>
                </div>

                {publicRooms.length === 0 ? (
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 text-center space-y-1.5">
                    <Film className="w-6 h-6 text-amber-400/60 mx-auto" />
                    <p className="text-xs font-semibold text-zinc-300">
                      No public parties active right now
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Switch to the Create tab to launch a free public room!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {publicRooms.map((room) => {
                      const capacity = getWatchPartyCapacity(room);
                      const viewerCount = Math.max(1, room.viewerCount || 1);
                      const isFull = viewerCount >= capacity;

                      return (
                        <div
                          key={room.roomId}
                          className="rounded-xl bg-[#13131b] border border-white/10 hover:border-[#D4AF37]/45 p-3 flex items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-black border border-white/10 shrink-0">
                              {room.coverImage ? (
                                <img
                                  src={room.coverImage}
                                  alt={room.episodeTitle}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-4 h-4 text-amber-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span className="font-mono-num text-[11px] font-bold text-[#FCE7A2]">
                                  {room.roomId}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-zinc-300">
                                  {room.category}
                                </span>
                                <span className="font-mono-num text-[10px] text-zinc-400">
                                  {viewerCount} / {capacity} watching
                                </span>
                                {isFull && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-[9px] font-extrabold text-red-300 uppercase tracking-wide">
                                    Room Full
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-white truncate">
                                {room.episodeTitle}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate">
                                Host: {room.hostName} · {room.episodeLabel}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={joining || isFull}
                            onClick={() => onRequestJoinRoom(room)}
                            className={`min-h-[40px] px-4 rounded-xl text-xs font-black inline-flex items-center gap-1 shrink-0 transition ${
                              isFull
                                ? 'bg-zinc-800 text-zinc-500 border border-white/10 cursor-not-allowed opacity-60'
                                : 'gold-gradient-bg text-[#181307] cursor-pointer hover:brightness-105'
                            }`}
                          >
                            {isFull ? (
                              <span>Room Full</span>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Join Room</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
