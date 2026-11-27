import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
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

interface WatchPartyOverlayProps {
  room: WatchPartyRoom;
  role: 'host' | 'guest';
  username: string;
  playerTotalCoins: number;
  episodes: DramaEpisode[];
  episodeSwitcherOpen: boolean;
  onCloseEpisodeSwitcher: () => void;
  onRequestSwitchEpisode: (episode: DramaEpisode) => void;
  onDeductSuperReactionCoins: (cost: number, title: string) => Promise<boolean>;
  onNotify?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
}

export const WatchPartyOverlay: React.FC<WatchPartyOverlayProps> = ({
  room,
  role,
  username,
  playerTotalCoins,
  episodes,
  episodeSwitcherOpen,
  onCloseEpisodeSwitcher,
  onRequestSwitchEpisode,
  onDeductSuperReactionCoins,
  onNotify,
}) => {
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [floatingBursts, setFloatingBursts] = useState<FloatingBurstReaction[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [superMode, setSuperMode] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [switcherGenre, setSwitcherGenre] = useState<ModernGenre>('All');
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [switcherSearchResults, setSwitcherSearchResults] = useState<DramaEpisode[]>([]);
  const [searchingSwitcher, setSearchingSwitcher] = useState(false);
  const [dmShows, setDmShows] = useState(() => getCachedDailymotionShowsByGenre('All') || []);

  const seenReactionIdsRef = useRef<Set<string>>(new Set());
  const initialReactionSnapDoneRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    seenReactionIdsRef.current.clear();
    initialReactionSnapDoneRef.current = false;
    setMessages([]);
    setFloatingBursts([]);

    const unsubMessages = subscribeWatchPartyMessages(
      room.roomId,
      (list) => setMessages(list),
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
              ? 18 + Math.round(Math.random() * 52)
              : 8 + Math.round(Math.random() * 76),
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
    if (chatMinimized) return;
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatMinimized]);

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
    const clean = chatInput.trim();
    if (!clean || sending) return;

    // Immediately clear chat input upon send
    setChatInput('');

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
        if (!paid) {
          return;
        }
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
      {/* Full-Screen Cross-Screen Floating Emoji & VIP Celebration Reactions Layer */}
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

      {/* Bottom-Left Translucent Live Chat Feed & Compact Input */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-none absolute bottom-2 left-2 sm:left-3 z-[25] w-[min(86vw,310px)] flex flex-col gap-1"
      >
        {!chatMinimized && (
          <div
            ref={chatScrollRef}
            className="pointer-events-auto max-h-16 overflow-y-auto space-y-0.5 px-2.5 py-1 rounded-xl bg-black/50 backdrop-blur-sm no-scrollbar shadow-sm"
          >
            {messages.length === 0 ? (
              <p className="text-[10px] text-zinc-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate">
                Room <strong className="text-[#FCE7A2] font-mono-num">{room.roomId}</strong> live • Say hi!
              </p>
            ) : (
              messages.slice(-12).map((msg) => (
                <div
                  key={msg.id}
                  className={`text-[10px] sm:text-[11px] leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                    msg.isSuper ? 'text-[#FFF8E7] font-semibold' : 'text-white/95'
                  }`}
                >
                  {msg.isSuper && (
                    <span className="inline-block mr-1 px-1 py-[1px] rounded bg-amber-400 text-[#181307] text-[8px] font-black uppercase tracking-wider align-middle shadow-sm">
                      VIP
                    </span>
                  )}
                  <span
                    className={`font-black mr-1 ${
                      msg.uid === room.hostUid ? 'text-amber-300' : 'text-[#FCE7A2]'
                    }`}
                  >
                    {msg.uid === room.hostUid ? '👑' : ''}
                    {msg.username}:
                  </span>
                  <span className="break-words">{msg.text}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="pointer-events-auto flex items-center gap-1 h-8 rounded-full bg-black/75 hover:bg-black/85 backdrop-blur-md px-1.5 border border-white/15 shadow-lg">
          <button
            type="button"
            onClick={() => setChatMinimized((prev) => !prev)}
            aria-label={chatMinimized ? 'Expand live chat feed' : 'Minimize live chat feed'}
            className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#FCE7A2] cursor-pointer shrink-0 transition"
          >
            {chatMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setSuperMode((prev) => !prev)}
            aria-pressed={superMode}
            title={`Toggle Gold Super Chat (${WATCH_PARTY_SUPER_COST} Coins)`}
            className={`min-h-[22px] px-1.5 rounded-full text-[9px] font-black inline-flex items-center gap-0.5 cursor-pointer transition shrink-0 ${
              superMode
                ? 'gold-gradient-bg border border-yellow-200 text-[#181307] shadow-[0_0_10px_rgba(251,191,36,0.85)]'
                : 'bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300'
            }`}
          >
            <Crown className="w-2.5 h-2.5 fill-current" />
            <span>{WATCH_PARTY_SUPER_COST}</span>
          </button>

          <form onSubmit={(e) => void handleSendChat(e)} className="flex-1 min-w-0 flex items-center gap-1 pr-0.5">
            <input
              type="text"
              maxLength={240}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={superMode ? 'Gold chat (-100)...' : 'Chat with room...'}
              className="w-full bg-transparent text-[11px] text-white placeholder:text-zinc-400 focus:outline-none"
            />
            {chatInput.trim() && (
              <button
                type="submit"
                disabled={sending}
                aria-label="Send message"
                className="w-6 h-6 rounded-full gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0 cursor-pointer shadow"
              >
                <Send className="w-3 h-3" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Host Episode Switcher Modal (Zero forced ad interruption!) */}
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
  onDeductSuperReactionCoins: (cost: number, title: string) => Promise<boolean>;
  onWatchBonusAd?: () => void;
  onNotify?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
}

export const WatchPartyReactionDock: React.FC<WatchPartyReactionDockProps> = ({
  room,
  username,
  playerTotalCoins,
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
        `Need ${spec.cost} Coins for ${spec.emoji} ${spec.label}. Tap +${WATCH_PARTY_VOLUNTARY_AD_COINS} Coins (Watch Ad) to earn more!`,
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
    <div className="shrink-0 relative z-20 w-full bg-[#0E0C13]/95 backdrop-blur-md border-t border-white/10 px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
      {/* Left: Free Quick Reactions (😂, 😱, ❤️) + VIP Animated Reactions (🔥 100, 👑 250) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          {WATCH_PARTY_FREE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={sending}
              onClick={() => void handleFreeReaction(emoji)}
              aria-label={`Free reaction ${emoji}`}
              className="min-h-[34px] min-w-[34px] px-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-base flex items-center justify-center active:scale-90 cursor-pointer transition"
            >
              {emoji}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-white/15 mx-0.5 hidden sm:inline-block" aria-hidden="true" />

        <div className="flex items-center gap-1.5">
          {WATCH_PARTY_VIP_REACTIONS.map((vip) => {
            const canAfford = playerTotalCoins >= vip.cost;
            return (
              <button
                key={vip.label}
                type="button"
                disabled={sending}
                onClick={() => void handleVipReaction(vip)}
                title={`${vip.label} (${vip.cost} Coins)`}
                className={`min-h-[34px] px-2.5 rounded-full border text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer transition ${
                  vip.emoji === '👑'
                    ? 'bg-gradient-to-r from-[#2e2107] to-[#1d1506] border-[#FBBF24]/75 text-[#FCE7A2] shadow-[0_0_14px_rgba(251,191,36,0.28)] hover:border-yellow-300'
                    : 'bg-gradient-to-r from-orange-950/85 to-rose-950/80 border-orange-400/70 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.25)] hover:border-orange-300'
                } ${!canAfford ? 'opacity-80' : ''}`}
              >
                <span className="text-sm leading-none">{vip.emoji}</span>
                <span>{vip.label}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-black/55 font-mono-num text-[9px] text-amber-300">
                  {vip.cost}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Coin Balance + Compact '+200 Coins (Watch Ad)' */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <div className="min-h-[32px] px-2.5 rounded-full bg-black/65 border border-[#D4AF37]/40 inline-flex items-center gap-1 text-[11px] font-mono-num font-extrabold text-[#FCE7A2]">
          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{playerTotalCoins.toLocaleString()}</span>
        </div>

        {onWatchBonusAd && (
          <button
            type="button"
            onClick={onWatchBonusAd}
            className="min-h-[32px] px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[10px] sm:text-[11px] font-black inline-flex items-center gap-1 whitespace-nowrap shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-95 cursor-pointer transition"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>+{WATCH_PARTY_VOLUNTARY_AD_COINS} Coins (Watch Ad)</span>
          </button>
        )}
      </div>
    </div>
  );
};
