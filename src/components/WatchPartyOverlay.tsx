import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Coins,
  Crown,
  Film,
  Search,
  Send,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import {
  WATCH_PARTY_FREE_EMOJIS,
  WATCH_PARTY_SUPER_COST,
  WATCH_PARTY_VIP_REACTIONS,
  WATCH_PARTY_VOLUNTARY_AD_COINS,
  resolveVideoSource,
} from '../constants';
import {
  sendWatchPartyMessage,
  sendWatchPartyReaction,
  subscribeWatchPartyMessages,
  subscribeWatchPartyReactions,
} from '../services/watchPartyService';
import {
  DramaEpisode,
  WatchPartyEmoji,
  WatchPartyMessage,
  WatchPartyRoom,
} from '../types';
import {
  MODERN_GENRES,
  ModernGenre,
  buildModernPlayerEpisode,
  fetchDailymotionShowsByGenre,
  getCachedDailymotionShowsByGenre,
  getModernCatalogByGenre,
  isEnglishCatalogTitle,
  searchDailymotionShows,
} from '../utils/modernCatalog';

interface FloatingBurstReaction {
  localKey: string;
  emoji: WatchPartyEmoji;
  username: string;
  isSuper: boolean;
  superCost: number;
  vipLabel?: string;
  leftPct: number;
}

interface FloatingChatPill {
  localKey: string;
  message: WatchPartyMessage;
}

interface WatchPartyOverlayProps {
  room: WatchPartyRoom;
  role: 'host' | 'guest';
  username: string;
  playerTotalCoins: number;
  viewerCount: number;
  episodes: DramaEpisode[];
  episodeSwitcherOpen: boolean;
  chatDrawerOpen: boolean;
  onCloseChatDrawer: () => void;
  onCloseEpisodeSwitcher: () => void;
  onRequestSwitchEpisode: (episode: DramaEpisode) => void;
  onDeductSuperReactionCoins: (cost: number, title: string) => Promise<boolean>;
  onNotify?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
  onIncomingChatPing?: () => void;
}

export const WatchPartyOverlay: React.FC<WatchPartyOverlayProps> = ({
  room,
  role,
  username,
  playerTotalCoins,
  viewerCount,
  episodes,
  episodeSwitcherOpen,
  chatDrawerOpen,
  onCloseChatDrawer,
  onCloseEpisodeSwitcher,
  onRequestSwitchEpisode,
  onDeductSuperReactionCoins,
  onNotify,
  onIncomingChatPing,
}) => {
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [floatingChatPills, setFloatingChatPills] = useState<FloatingChatPill[]>([]);
  const [floatingBursts, setFloatingBursts] = useState<FloatingBurstReaction[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [superMode, setSuperMode] = useState(false);
  const [sending, setSending] = useState(false);

  const [switcherGenre, setSwitcherGenre] = useState<ModernGenre>('All');
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [switcherSearchResults, setSwitcherSearchResults] = useState<DramaEpisode[]>([]);
  const [searchingSwitcher, setSearchingSwitcher] = useState(false);
  const [dmShows, setDmShows] = useState(() => getCachedDailymotionShowsByGenre('All') || []);

  const seenReactionIdsRef = useRef<Set<string>>(new Set());
  const initialReactionSnapDoneRef = useRef(false);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessageSnapDoneRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatDrawerOpenRef = useRef(chatDrawerOpen);
  const onIncomingChatPingRef = useRef(onIncomingChatPing);

  useEffect(() => {
    chatDrawerOpenRef.current = chatDrawerOpen;
  }, [chatDrawerOpen]);

  useEffect(() => {
    onIncomingChatPingRef.current = onIncomingChatPing;
  }, [onIncomingChatPing]);

  useEffect(() => {
    seenReactionIdsRef.current.clear();
    initialReactionSnapDoneRef.current = false;
    seenMessageIdsRef.current.clear();
    initialMessageSnapDoneRef.current = false;
    setMessages([]);
    setFloatingChatPills([]);
    setFloatingBursts([]);

    const unsubMessages = subscribeWatchPartyMessages(
      room.roomId,
      (list) => {
        setMessages(list);
        const nowMs = Date.now();
        const freshlyArrived: FloatingChatPill[] = [];

        if (!initialMessageSnapDoneRef.current) {
          list.forEach((m) => {
            seenMessageIdsRef.current.add(m.id);
            const createdMs =
              typeof m.createdAt?.toMillis === 'function' ? m.createdAt.toMillis() : 0;
            if (createdMs && nowMs - createdMs < 8000) {
              freshlyArrived.push({ localKey: `${m.id}_init`, message: m });
            }
          });
          initialMessageSnapDoneRef.current = true;
        } else {
          list.forEach((m) => {
            if (seenMessageIdsRef.current.has(m.id)) return;
            seenMessageIdsRef.current.add(m.id);
            freshlyArrived.push({ localKey: `${m.id}_${nowMs}`, message: m });
            if (!chatDrawerOpenRef.current) {
              onIncomingChatPingRef.current?.();
            }
          });
        }

        if (freshlyArrived.length > 0) {
          const capped = freshlyArrived.slice(-4);
          setFloatingChatPills((prev) => [...prev, ...capped].slice(-4));
          capped.forEach((item) => {
            window.setTimeout(() => {
              setFloatingChatPills((prev) =>
                prev.filter((pill) => pill.localKey !== item.localKey)
              );
            }, 8050);
          });
        }
      },
      () => {}
    );

    const unsubReactions = subscribeWatchPartyReactions(
      room.roomId,
      (list) => {
        if (!initialReactionSnapDoneRef.current) {
          list.forEach((rx) => seenReactionIdsRef.current.add(rx.id));
          initialReactionSnapDoneRef.current = true;
          return;
        }
        const newlyAdded: FloatingBurstReaction[] = [];
        list.forEach((rx) => {
          if (seenReactionIdsRef.current.has(rx.id)) return;
          seenReactionIdsRef.current.add(rx.id);
          newlyAdded.push({
            localKey: `${rx.id}_${Date.now()}`,
            emoji: rx.emoji,
            username: rx.username,
            isSuper: rx.isSuper,
            superCost: rx.superCost || 0,
            vipLabel: rx.vipLabel,
            leftPct: rx.isSuper
              ? 20 + Math.round(Math.random() * 52)
              : 10 + Math.round(Math.random() * 76),
          });
        });
        if (newlyAdded.length > 0) {
          setFloatingBursts((prev) => [...prev, ...newlyAdded].slice(-20));
          newlyAdded.forEach((item) => {
            window.setTimeout(
              () => {
                setFloatingBursts((prev) => prev.filter((b) => b.localKey !== item.localKey));
              },
              item.isSuper ? 3400 : 2700
            );
          });
        }
      },
      () => {}
    );

    return () => {
      unsubMessages();
      unsubReactions();
    };
  }, [room.roomId]);

  useEffect(() => {
    if (!chatDrawerOpen) return;
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatDrawerOpen]);

  useEffect(() => {
    if (!episodeSwitcherOpen) return;
    const cached = getCachedDailymotionShowsByGenre(switcherGenre);
    if (cached && cached.length > 0) {
      setDmShows(cached);
      return;
    }
    const controller = new AbortController();
    fetchDailymotionShowsByGenre(switcherGenre, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setDmShows(items);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [episodeSwitcherOpen, switcherGenre]);

  useEffect(() => {
    if (!episodeSwitcherOpen) return;
    const clean = switcherSearch.trim();
    if (clean.length < 2) {
      setSwitcherSearchResults([]);
      setSearchingSwitcher(false);
      return;
    }
    const controller = new AbortController();
    setSearchingSwitcher(true);
    const timer = window.setTimeout(() => {
      void searchDailymotionShows(clean, controller.signal)
        .then((shows) => {
          if (!controller.signal.aborted) {
            setSwitcherSearchResults(shows.map(buildModernPlayerEpisode));
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setSearchingSwitcher(false);
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [episodeSwitcherOpen, switcherSearch]);

  const switcherCatalog = useMemo(() => {
    const map = new Map<string, DramaEpisode>();
    const tryAdd = (ep: DramaEpisode) => {
      if (!ep?.id || map.has(ep.id)) return;
      if (!isEnglishCatalogTitle(ep.title)) return;
      if (resolveVideoSource((ep.videoUrl || ep.youtubeUrl || '').trim()).kind === 'empty') return;
      map.set(ep.id, ep);
    };

    switcherSearchResults.forEach(tryAdd);
    dmShows.map(buildModernPlayerEpisode).forEach(tryAdd);
    if (switcherGenre === 'All') {
      episodes.forEach(tryAdd);
    } else {
      episodes
        .filter((ep) => (ep.category || '').toLowerCase() === switcherGenre.toLowerCase())
        .forEach(tryAdd);
    }
    getModernCatalogByGenre(switcherGenre, dmShows)
      .map(buildModernPlayerEpisode)
      .forEach(tryAdd);

    const all = Array.from(map.values());
    const cleanQ = switcherSearch.trim().toLowerCase();
    if (!cleanQ) return all.slice(0, 28);
    return all
      .filter((ep) => {
        const hay = `${ep.title} ${ep.series} ${ep.category || ''} ${ep.episodeLabel}`.toLowerCase();
        return hay.includes(cleanQ);
      })
      .slice(0, 28);
  }, [switcherSearchResults, dmShows, episodes, switcherGenre, switcherSearch]);

  const handleSendChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawValue = chatInput || chatInputRef.current?.value || '';
    const clean = rawValue.trim();
    if (!clean || sending) return;

    // Immediately clear text input upon send
    setChatInput('');
    if (chatInputRef.current) {
      chatInputRef.current.value = '';
    }

    if (superMode && playerTotalCoins < WATCH_PARTY_SUPER_COST) {
      onNotify?.(
        `You need ${WATCH_PARTY_SUPER_COST} Coins for Gold Highlighted Chat.`,
        'error'
      );
      return;
    }

    const useSuper = superMode;
    if (useSuper) setSuperMode(false);
    setSending(true);
    try {
      if (useSuper) {
        const paid = await onDeductSuperReactionCoins(
          WATCH_PARTY_SUPER_COST,
          `Watch Party Gold Highlight Chat (${room.roomId})`
        );
        if (!paid) return;
      }
      await sendWatchPartyMessage(room.roomId, {
        username,
        text: clean,
        isSuper: useSuper,
      });
    } catch {
      onNotify?.('Unable to send message right now.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. TikTok Live-Style Floating Chat Overlay (Last 3-4 Incoming Messages, Fade Out After 8s) */}
      {!chatDrawerOpen && floatingChatPills.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-2.5 sm:left-4 z-20 max-w-[min(82vw,330px)] flex flex-col items-start gap-1.5"
        >
          {floatingChatPills.slice(-4).map(({ localKey, message }) => (
            <div
              key={localKey}
              className={`watch-party-chat-pill rounded-2xl px-3 py-1.5 text-xs leading-snug bg-black/60 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.45)] border ${
                message.isSuper
                  ? 'border-[#D4AF37]/65 text-[#FFF8E7]'
                  : 'border-white/15 text-white'
              }`}
            >
              {message.isSuper && (
                <span className="inline-block mr-1.5 px-1.5 py-[1px] rounded bg-amber-400 text-[#181307] text-[9px] font-black uppercase tracking-wider align-middle">
                  VIP
                </span>
              )}
              <span
                className={`font-black mr-1.5 ${
                  message.uid === room.hostUid ? 'text-amber-300' : 'text-[#FCE7A2]'
                }`}
              >
                {message.uid === room.hostUid ? '👑 ' : ''}
                {message.username}:
              </span>
              <span className="break-words">{message.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. Full-Screen Cross-Screen Floating Emoji & VIP Celebration Reactions Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      >
        {floatingBursts.map((burst) =>
          burst.isSuper ? (
            <div
              key={burst.localKey}
              className="watch-party-vip-float absolute bottom-20 flex flex-col items-center gap-1 -translate-x-1/2"
              style={{ left: `${burst.leftPct}%` }}
            >
              <span
                className={`text-6xl sm:text-7xl drop-shadow-[0_0_28px_rgba(251,191,36,0.95)] ${
                  burst.emoji === '🔥'
                    ? 'filter drop-shadow-[0_0_28px_rgba(249,115,22,0.95)]'
                    : ''
                }`}
              >
                {burst.emoji}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shadow-[0_6px_24px_rgba(0,0,0,0.85)] border ${
                  burst.superCost >= 250 || burst.emoji === '👑'
                    ? 'gold-gradient-bg border-yellow-100 text-[#181307]'
                    : 'bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 border-amber-200 text-white'
                }`}
              >
                {burst.emoji} {burst.username} · {burst.vipLabel || 'VIP Reaction'}!
              </span>
            </div>
          ) : (
            <div
              key={burst.localKey}
              className="watch-party-float absolute bottom-16 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${burst.leftPct}%` }}
            >
              <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)]">
                {burst.emoji}
              </span>
            </div>
          )
        )}
      </div>

      {/* 3. Slide-Up Semi-Transparent Collapsible Chat Drawer */}
      {chatDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live Party Chat Drawer"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) onCloseChatDrawer();
          }}
          className="fixed inset-0 z-[70] bg-black/35 flex flex-col justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="watch-party-drawer-slide w-full max-h-[60dvh] rounded-t-3xl bg-[#0d0d12]/88 backdrop-blur-xl border-t border-[#D4AF37]/40 shadow-[0_-18px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="shrink-0 px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#FCE7A2] truncate">
                  💬 Live Party Chat
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] font-mono-num text-[10px] font-bold text-zinc-300 shrink-0">
                  {Math.max(1, viewerCount)} online
                </span>
              </div>

              <button
                type="button"
                onClick={onCloseChatDrawer}
                aria-label="Close chat drawer"
                className="h-8 w-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-zinc-200 flex items-center justify-center cursor-pointer shrink-0 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Full Message History */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-[160px] overflow-y-auto px-3.5 py-2.5 space-y-2"
            >
              {messages.length === 0 ? (
                <div className="h-full min-h-[120px] flex items-center justify-center text-center px-4">
                  <p className="text-xs text-zinc-400">
                    Room <strong className="text-[#FCE7A2] font-mono-num">{room.roomId}</strong> is live — send the first message!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl px-3 py-2 text-xs leading-snug ${
                      msg.isSuper
                        ? 'bg-gradient-to-r from-[#281e09]/90 to-[#181308]/90 border border-[#D4AF37]/50 text-[#FFF8E7] shadow-sm'
                        : 'bg-white/[0.06] border border-white/10 text-zinc-100'
                    }`}
                  >
                    {msg.isSuper && (
                      <span className="inline-block mr-1.5 px-1.5 py-[1px] rounded bg-amber-400 text-[#181307] text-[9px] font-black uppercase tracking-wider align-middle">
                        VIP
                      </span>
                    )}
                    <span
                      className={`font-black mr-1.5 ${
                        msg.uid === room.hostUid ? 'text-amber-300' : 'text-[#FCE7A2]'
                      }`}
                    >
                      {msg.uid === room.hostUid ? '👑 ' : ''}
                      {msg.username}:
                    </span>
                    <span className="break-words">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Chat Text Input Box */}
            <form
              onSubmit={(e) => void handleSendChat(e)}
              className="shrink-0 px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-black/55 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setSuperMode((prev) => !prev)}
                aria-pressed={superMode}
                title={`Toggle Gold Super Chat (${WATCH_PARTY_SUPER_COST} Coins)`}
                className={`min-h-[38px] px-2.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 cursor-pointer transition shrink-0 ${
                  superMode
                    ? 'gold-gradient-bg border border-yellow-200 text-[#181307] shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-amber-300'
                }`}
              >
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>{WATCH_PARTY_SUPER_COST}</span>
              </button>

              <input
                ref={chatInputRef}
                type="text"
                maxLength={240}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  superMode ? 'Send Gold VIP chat (-100)...' : 'Say something to the room...'
                }
                autoFocus
                className="flex-1 min-w-0 min-h-[40px] px-3.5 rounded-full bg-black/75 border border-white/20 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />

              <button
                type="submit"
                disabled={sending || !chatInput.trim()}
                aria-label="Send message"
                className="min-h-[40px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-black inline-flex items-center justify-center gap-1 shrink-0 disabled:opacity-45 cursor-pointer shadow transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Host Episode Switcher Modal */}
      {episodeSwitcherOpen && role === 'host' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Switch Watch Party Episode"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) onCloseEpisodeSwitcher();
          }}
          className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-5"
        >
          <div className="w-full max-w-lg max-h-[82dvh] rounded-2xl bg-[#0D0D13] border border-[#D4AF37]/50 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#141108]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-[#FBBF24] shrink-0" />
                  <h3 className="text-sm sm:text-base font-display font-bold text-white truncate">
                    Switch Lobby Episode
                  </h3>
                </div>
                <p className="text-[11px] text-amber-200/85">
                  Switch the movie immediately in sync for everyone
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseEpisodeSwitcher}
                aria-label="Close episode switcher"
                className="min-h-[36px] min-w-[36px] rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-1 border-b border-white/[0.06]">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-amber-400/80 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  placeholder="Search drama, horror, romance, English anime..."
                  className="w-full min-h-[38px] pl-9 pr-9 rounded-xl bg-black/65 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
                {switcherSearch && (
                  <button
                    type="button"
                    onClick={() => setSwitcherSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {MODERN_GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSwitcherGenre(genre)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer border ${
                    switcherGenre === genre
                      ? 'gold-gradient-bg border-amber-200 text-[#181307]'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2">
              {searchingSwitcher && switcherCatalog.length === 0 ? (
                <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center text-xs text-zinc-400">
                  Searching English HD catalog...
                </div>
              ) : switcherCatalog.length === 0 ? (
                <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-center text-xs text-zinc-400">
                  No matching English titles found for &ldquo;{switcherSearch}&rdquo;.
                </div>
              ) : (
                switcherCatalog.map((ep) => {
                  const isCurrent = ep.id === room.episodeId;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        onCloseEpisodeSwitcher();
                        onRequestSwitchEpisode(ep);
                      }}
                      className={`w-full text-left rounded-xl p-2.5 border flex items-center justify-between gap-3 transition cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-950/40 border-emerald-400/50 opacity-80 cursor-default'
                          : 'bg-[#14141d] border-white/10 hover:border-[#D4AF37]/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                          {ep.coverImage ? (
                            <img
                              src={ep.coverImage}
                              alt={ep.title}
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
                          <span className="text-[10px] font-bold uppercase text-amber-300">
                            {ep.category || 'Drama'} · {ep.episodeLabel}
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                            {ep.title}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                            : 'gold-gradient-bg text-[#181307]'
                        }`}
                      >
                        <Tv className="w-3 h-3" />
                        <span>{isCurrent ? 'Playing' : 'Switch Live'}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface WatchPartyReactionDockProps {
  room: WatchPartyRoom;
  username: string;
  playerTotalCoins: number;
  chatDrawerOpen: boolean;
  unreadChatCount?: number;
  onToggleChatDrawer: () => void;
  onDeductSuperReactionCoins: (cost: number, title: string) => Promise<boolean>;
  onWatchBonusAd?: () => void;
  onNotify?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
}

export const WatchPartyReactionDock: React.FC<WatchPartyReactionDockProps> = ({
  room,
  username,
  playerTotalCoins,
  chatDrawerOpen,
  unreadChatCount = 0,
  onToggleChatDrawer,
  onDeductSuperReactionCoins,
  onWatchBonusAd,
  onNotify,
}) => {
  const [sending, setSending] = useState(false);

  const handleFreeReaction = async (emoji: WatchPartyEmoji) => {
    if (sending) return;
    setSending(true);
    try {
      await sendWatchPartyReaction(room.roomId, {
        username,
        emoji,
        isSuper: false,
        superCost: 0,
      });
    } catch {
      onNotify?.('Unable to send reaction right now.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleVipReaction = async (spec: (typeof WATCH_PARTY_VIP_REACTIONS)[number]) => {
    if (sending) return;
    if (playerTotalCoins < spec.cost) {
      onNotify?.(
        `Need ${spec.cost} Coins for ${spec.emoji} ${spec.label}. Tap +${WATCH_PARTY_VOLUNTARY_AD_COINS} Coins to earn more!`,
        'error'
      );
      return;
    }

    setSending(true);
    try {
      const paid = await onDeductSuperReactionCoins(
        spec.cost,
        `VIP Reaction: ${spec.emoji} ${spec.label} (${room.roomId})`
      );
      if (!paid) return;

      await Promise.all([
        sendWatchPartyReaction(room.roomId, {
          username,
          emoji: spec.emoji,
          isSuper: true,
          superCost: spec.cost,
          vipLabel: spec.label,
        }),
        sendWatchPartyMessage(room.roomId, {
          username,
          text: `Triggered VIP ${spec.emoji} ${spec.label}!`,
          isSuper: true,
          emoji: spec.emoji,
        }),
      ]);
    } catch {
      onNotify?.('Unable to trigger VIP reaction right now.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="shrink-0 relative z-30 w-full bg-[#0d0d12]/95 border-t border-white/10 px-2.5 sm:px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
      {/* Collapsible Chat Drawer Trigger */}
      <button
        type="button"
        onClick={onToggleChatDrawer}
        aria-expanded={chatDrawerOpen}
        className={`relative h-8 px-3 rounded-full border text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer transition shrink-0 ${
          chatDrawerOpen
            ? 'gold-gradient-bg border-amber-200 text-[#181307] shadow-[0_0_12px_rgba(251,191,36,0.45)]'
            : 'bg-white/[0.1] hover:bg-white/[0.18] border-white/20 text-white'
        }`}
      >
        <span>💬 Chat</span>
        {!chatDrawerOpen && unreadChatCount > 0 && (
          <span className="px-1.5 py-[1px] rounded-full bg-amber-400 text-[#181307] font-mono-num text-[9px] font-black leading-none">
            {unreadChatCount > 99 ? '99+' : unreadChatCount}
          </span>
        )}
      </button>

      <span className="h-4 w-px bg-white/15 shrink-0" aria-hidden="true" />

      {/* Free Quick Reactions (😂, 😱, ❤️) */}
      <div className="flex items-center gap-1 shrink-0">
        {WATCH_PARTY_FREE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={sending}
            onClick={() => void handleFreeReaction(emoji)}
            aria-label={`Free reaction ${emoji}`}
            className="h-8 w-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-base flex items-center justify-center active:scale-90 cursor-pointer transition shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      <span className="h-4 w-px bg-white/15 shrink-0" aria-hidden="true" />

      {/* Compact VIP Animated Reactions (🔥 100, 👑 250) */}
      <div className="flex items-center gap-1 shrink-0">
        {WATCH_PARTY_VIP_REACTIONS.map((vip) => {
          const canAfford = playerTotalCoins >= vip.cost;
          return (
            <button
              key={vip.label}
              type="button"
              disabled={sending}
              onClick={() => void handleVipReaction(vip)}
              title={`${vip.label} (${vip.cost} Coins)`}
              className={`h-8 px-2.5 rounded-full border text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer transition shrink-0 ${
                vip.emoji === '👑'
                  ? 'bg-gradient-to-r from-[#2e2107] to-[#1d1506] border-[#FBBF24]/75 text-[#FCE7A2] shadow-[0_0_12px_rgba(251,191,36,0.28)] hover:border-yellow-300'
                  : 'bg-gradient-to-r from-orange-950/85 to-rose-950/80 border-orange-400/70 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.25)] hover:border-orange-300'
              } ${!canAfford ? 'opacity-80' : ''}`}
            >
              <span className="text-sm leading-none">{vip.emoji}</span>
              <span className="font-mono-num text-[10px]">{vip.cost}</span>
            </button>
          );
        })}
      </div>

      {/* Coin Balance & Compact +200 Coins Button */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <div className="h-8 px-2 rounded-full bg-black/65 border border-[#D4AF37]/40 inline-flex items-center gap-1 text-[11px] font-mono-num font-extrabold text-[#FCE7A2] shrink-0">
          <Coins className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{playerTotalCoins.toLocaleString()}</span>
        </div>

        {onWatchBonusAd && (
          <button
            type="button"
            onClick={onWatchBonusAd}
            className="h-8 px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[10px] font-black inline-flex items-center gap-1 whitespace-nowrap shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-95 cursor-pointer transition shrink-0"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>+{WATCH_PARTY_VOLUNTARY_AD_COINS} Coins</span>
          </button>
        )}
      </div>
    </div>
  );
};
