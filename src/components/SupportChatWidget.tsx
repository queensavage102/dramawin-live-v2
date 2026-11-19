
import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Headphones,
  Mail,
  MessageSquareHeart,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import { R3_BOOST_ZAR, R3_MYSTERY_CYCLE_ADS } from '../constants';
import { auth } from '../firebase';
import { SupportCategory, SupportMessageRecord } from '../types';
import { addLocalSupportMessage } from '../utils/localState';
import { submitSupportMessageAndNotifyEmail } from '../services/dramawinService';

const CHAT_STORAGE_KEY = 'dramawin_support_chat_v1';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: 'open_ticket';
}

export interface SupportTicketSubmissionInput {
  username: string;
  contact: string;
  category: SupportCategory;
  subject: string;
  message: string;
}

interface SupportChatWidgetProps {
  uid?: string;
  username: string;
  contact: string;
  coins: number;
  weeklyCoins: number;
  qualificationThreshold: number;
  poolPrizeZar: number;
  isFirebaseSignedIn: boolean;
  firebaseEmail?: string | null;
  onSignInGoogle: () => Promise<void>;
  onTicketsUpdated?: (tickets: SupportMessageRecord[]) => void;
}

const QUICK_PROMPTS = [
  'How do I earn coins fast?',
  `How does the R${R3_BOOST_ZAR} Boost work?`,
  'Am I qualified for Sunday Pool?',
  'Missing coins / prize help',
];

const SUPPORT_CATEGORY_OPTIONS: { value: SupportCategory; label: string }[] = [
  { value: 'claim_prize', label: 'Claim Prize / Payout' },
  { value: 'mystery_box', label: `${R3_MYSTERY_CYCLE_ADS}-Ad R${R3_BOOST_ZAR} Mystery Box` },
  { value: 'coins', label: 'Coins & Daily Streak' },
  { value: 'sunday_pool', label: 'Sunday Pool & Leaderboard' },
  { value: 'feedback', label: 'Complaint / Feedback' },
  { value: 'other', label: 'Other Support' },
];

function buildConversationalReply(
  question: string,
  ctx: {
    username: string;
    coins: number;
    weeklyCoins: number;
    qualificationThreshold: number;
    poolPrizeZar: number;
  }
): { text: string; action?: 'open_ticket' } {
  const q = question.toLowerCase().trim();
  const firstName =
    ctx.username && ctx.username !== 'Player' ? ctx.username.split(' ') .at(0): 'friend';
  const safeThreshold = Math.max(1, ctx.qualificationThreshold || 500000);
  const currentWeekly = ctx.weeklyCoins || 0;
  const remainingWeekly = Math.max(0, safeThreshold - currentWeekly);
  const progressPct = Math.min(100, Math.round((currentWeekly / safeThreshold) * 100));

  if (/\b(thank|thanks|thx|appreciate|awesome|cool|sharp|shot|perfect|nice)\b/.test(q)) {
    return {
      text: `You're welcome, ${firstName}! Enjoy watching and stacking those coins. Shout anytime if you need anything else!`,
    };
  }

  if (q.includes('how are you') || q.includes('howzit') || q.includes("what's up") || q.includes('wassup')) {
    return {
      text: `Doing great, ${firstName}! I see you've got ${ctx.coins.toLocaleString()} Coins in your wallet right now. Want tips on boosting your balance or checking your Sunday Pool progress?`,
    };
  }

  if (/^(hi|hello|hey|yo|ekse|heita|hola|good morning|good afternoon|good evening)\b/.test(q)) {
    return {
      text: `Hey ${firstName}! Welcome to DramaWin VIP Support. You currently have ${ctx.coins.toLocaleString()} Coins—what can I help you with today?`,
    };
  }

  if (
    q.includes('missing') ||
    q.includes("didn't get") ||
    q.includes('did not get') ||
    q.includes('not working') ||
    q.includes('stuck') ||
    q.includes('bug') ||
    q.includes('error') ||
    q.includes('issue') ||
    q.includes('problem') ||
    q.includes('complaint') ||
    q.includes('lost') ||
    q.includes('scam') ||
    q.includes('admin') ||
    q.includes('human') ||
    q.includes('person')
  ) {
    return {
      text: `I'm sorry you're running into trouble, ${firstName}! Let's get that sorted out for you right away. Tap the button below to send a direct note to our admin team with your coin balance attached so we can fix it manually.`,
      action: 'open_ticket',
    };
  }

  if (
    q.includes('11') ||
    q.includes('r3') ||
    q.includes('mystery') ||
    q.includes('box') ||
    q.includes('boost') ||
    q.includes('vault') ||
    q.includes('reset')
  ) {
    return {
      text: `Here is how the Mystery Vault works, ${firstName}:\n\n1. Tap any glowing box and watch the full 20-second ad to grab +100 Coins.\n2. Every time you complete ${R3_MYSTERY_CYCLE_ADS} boxes, you unlock a massive +1,000 Coin R${R3_BOOST_ZAR} Boost!\n3. After Box #${R3_MYSTERY_CYCLE_ADS}, the grid automatically resets to Box #1 so you can repeat it as many times as you like.`,
    };
  }

  if (
    q.includes('fast') ||
    q.includes('earn') ||
    q.includes('coin') ||
    q.includes('streak') ||
    q.includes('watch') ||
    q.includes('pot') ||
    q.includes('how does this work') ||
    q.includes('how do i play')
  ) {
    return {
      text: `You already have ${ctx.coins.toLocaleString()} Coins, ${firstName}! Here are the 3 best ways to stack more fast:\n\n• Watch Episodes: Stay on any drama for 30+ seconds to fill the 60s Coin Pot (+100 to +300 Coins).\n• Mystery Vault: Complete ${R3_MYSTERY_CYCLE_ADS} short box ads for +2,100 total Coins per cycle.\n• Daily Streak: Visit the Rewards tab once a day to claim your streak bonus.`,
    };
  }

  if (
    q.includes('sunday') ||
    q.includes('pool') ||
    q.includes('payout') ||
    q.includes('qualif') ||
    q.includes('leaderboard') ||
    q.includes('winner') ||
    q.includes('prize') ||
    q.includes('claim') ||
    q.includes('withdraw') ||
    q.includes('cash') ||
    q.includes('money')
  ) {
    const progressLine =
      remainingWeekly === 0
        ? `Great news—you've already hit ${currentWeekly.toLocaleString()} weekly coins and are 100% qualified!`
        : `You're currently at ${progressPct}% (${currentWeekly.toLocaleString()} / ${safeThreshold.toLocaleString()} weekly coins), so you just need ${remainingWeekly.toLocaleString()} more weekly coins to qualify.`;

    return {
      text: `Every Sunday at 23:59 SAST, the R${ctx.poolPrizeZar} Sunday Pool is shared among the Top 3 qualified players (50% for 1st, 30% for 2nd, 20% for 3rd).\n\n${progressLine}`,
    };
  }

  if (q.includes('sound') || q.includes('volume') || q.includes('audio') || q.includes('mute') || q.includes('video')) {
    return {
      text: `If a drama has no sound, tap the speaker icon near the top of the video player to unmute it and check your phone's media volume. If the video still won't play, tap below to message our team!`,
      action: 'open_ticket',
    };
  }

  return {
    text: `I want to make sure I give you the exact right answer, ${firstName}! I can help with earning coins, the ${R3_MYSTERY_CYCLE_ADS}-Ad R${R3_BOOST_ZAR} Boost, or Sunday Pool payouts—or if you'd rather chat with our team directly, tap below to send a quick message.`,
    action: 'open_ticket',
  };
}

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  uid = 'player',
  username,
  contact,
  coins,
  weeklyCoins,
  qualificationThreshold,
  poolPrizeZar,
  firebaseEmail = null,
  onTicketsUpdated,
}) => {
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'ai' | 'ticket'>('ai');

  const getInitialMessage = (): ChatMessageItem => {
  const firstName = username && username !== 'Player' ? username.split(' ').at(0) : 'there';

    return {
      id: 'welcome-bot',
      role: 'assistant',
      text: `Hey ${firstName}! 👋 I'm your DramaWin VIP Assistant. Ask me anything about your coins, the R${R3_BOOST_ZAR} Mystery Boost, or Sunday Pool payouts!`,
    };
  };

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [getInitialMessage()];
  });
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [ticketName, setTicketName] = useState(username || 'Player');
  const [ticketContact, setTicketContact] = useState(
    contact && contact !== 'Instant Play' ? contact : firebaseEmail || ''
  );
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>('claim_prize');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    id: string;
    syncedToCloud: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Ignore
    }
  }, [messages]);

  useEffect(() => {
    setTicketName((prev) => (prev.trim() ? prev : username || 'Player'));
  }, [username]);

  useEffect(() => {
    if (firebaseEmail && !ticketContact.trim()) {
      setTicketContact(firebaseEmail);
    } else if (contact && contact !== 'Instant Play' && !ticketContact.trim()) {
      setTicketContact(contact);
    }
  }, [contact, firebaseEmail, ticketContact]);

  useEffect(() => {
    if (open && activeMode === 'ai' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, activeMode, messages, isTyping]);

  const sendAiPrompt = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isTyping) return;

    const now = Date.now();
    const userMsg: ChatMessageItem = {
      id: `user-${now}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    const chatTicketId = `chat-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const nextTickets = addLocalSupportMessage({
      id: chatTicketId,
      uid,
      username: (username || 'Player').trim(),
      contact: (contact || firebaseEmail || 'In-App Chat').trim(),
      category: 'other',
      subject: 'AI Chat Message',
      message: trimmed,
      status: 'open',
      source: 'local',
      createdAtMs: now,
      updatedAtMs: now,
    });
    onTicketsUpdated?.(nextTickets);

    const syncChatTicket = async () => {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      await submitSupportMessageAndNotifyEmail({
        id: chatTicketId,
        uid: auth.currentUser?.uid || uid || '',
        username: (username || 'Player').trim(),
        contact: (contact || firebaseEmail || 'In-App Chat').trim(),
        category: 'other',
        subject: 'AI Chat Message',
        message: trimmed,
      });
    };
    void syncChatTicket().catch((err) => console.error('Cloud chat sync failed:', err));

    setTimeout(() => {
      const reply = buildConversationalReply(trimmed, {
        username,
        coins,
        weeklyCoins,
        qualificationThreshold,
        poolPrizeZar,
      });

      const botMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: reply.text,
        action: reply.action,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 350);
  };

  const handleClearChat = () => {
    const fresh = [getInitialMessage()];
    setMessages(fresh);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendAiPrompt(chatInput);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingTicket) return;
    setTicketError(null);
    setSubmittedReceipt(null);

    if (ticketName.trim().length < 2) {
      setTicketError('Please enter your player name.');
      return;
    }
    if (ticketContact.trim().length < 4) {
      setTicketError('Please enter your Email or WhatsApp so we can reply.');
      return;
    }
    if (ticketSubject.trim().length < 2) {
      setTicketError('Please add a short subject.');
      return;
    }
    if (ticketMessage.trim().length < 5) {
      setTicketError('Please describe your issue or question.');
      return;
    }

    setSubmittingTicket(true);
    const nowMs = Date.now();
    const ticketId = `msg-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const resolvedUid = auth.currentUser?.uid || uid;

      await submitSupportMessageAndNotifyEmail({
        id: ticketId,
        uid: resolvedUid,
        username: ticketName.trim(),
        contact: ticketContact.trim(),
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });

      const nextTickets = addLocalSupportMessage({
        id: ticketId,
        uid: resolvedUid,
        username: ticketName.trim(),
        contact: ticketContact.trim(),
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        status: 'open',
        source: 'cloud',
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });

      onTicketsUpdated?.(nextTickets);
      setSubmittedReceipt({
        id: ticketId,
        syncedToCloud: true,
      });
      setTicketSubject('');
      setTicketMessage('');
    } catch (err) {
      const reason =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to reach support server.';
      setTicketError(
        `Failed to send support message (${reason}). Please check your internet connection and try again.`
      );
    } finally {
      setSubmittingTicket(false);
    }
  };
  return (
    <>
      {open ? (
        <div className="fixed inset-x-2 bottom-20 top-14 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[390px] sm:h-[540px] z-50 flex flex-col">
          <section
            role="dialog"
            aria-label="DramaWin VIP Support"
            className="flex-1 rounded-2xl border border-amber-400/25 bg-[#12100e]/95 backdrop-blur-md text-white shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1a1612] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-amber-200 truncate">
                    DramaWin VIP Support
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {coins.toLocaleString()} Coins · R{poolPrizeZar} Sunday Pool
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeMode === 'ai' && messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear chat"
                    aria-label="Clear chat"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-white/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Support"
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-white/5 hover:bg-white/15 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented Mode Switch */}
            <div className="p-2 bg-[#16130f] border-b border-white/10 shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40">
                <button
                  type="button"
                  onClick={() => setActiveMode('ai')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                    activeMode === 'ai'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span>AI Assistant</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('ticket');
                    setSubmittedReceipt(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                    activeMode === 'ticket'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Message Admin</span>
                </button>
              </div>
            </div>

            {/* AI Assistant Mode */}
            {activeMode === 'ai' ? (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                          m.role === 'user'
                            ? 'bg-amber-400 text-black font-medium rounded-br-sm'
                            : 'bg-[#1e1a15] border border-white/10 text-zinc-100 rounded-bl-sm'
                        }`}
                      >
                        {m.text}
                      </div>

                      {m.action === 'open_ticket' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMode('ticket');
                            setSubmittedReceipt(null);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[11px] font-semibold transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Open Message Admin Form
                        </button>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm px-3.5 py-2 bg-[#1e1a15] border border-white/10 text-zinc-400 text-xs">
                        Typing...
                      </div>
                    </div>
                  )}
                </div>

                {/* Compact Horizontal Quick Prompts */}
                <div className="px-3 py-1.5 border-t border-white/5 bg-[#15120e] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendAiPrompt(prompt)}
                      className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-400/20 border border-amber-400/25 text-amber-200 transition shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleChatSubmit}
                  className="p-2.5 bg-[#1a1612] border-t border-white/10 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-black/40 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    className="p-2 rounded-xl bg-amber-400 text-black hover:bg-amber-300 transition shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              /* Clean Admin Ticket Form */
              <div className="flex-1 overflow-y-auto p-3.5">
                <form onSubmit={handleTicketSubmit} className="space-y-2.5">
                  {submittedReceipt && (
                    <div
                      role="status"
                      className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-emerald-300">Message sent to Admin Board!</p>
                        <p className="text-[11px] text-emerald-200/80 font-mono">
                          Ticket {submittedReceipt.id}
                        </p>
                      </div>
                    </div>
                  )}

                  {ticketError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/60 text-red-100 text-xs font-medium leading-snug"
                    >
                      {ticketError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Player Name
                      </label>
                      <input
                        type="text"
                        value={ticketName}
                        onChange={(e) => setTicketName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        Email / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={ticketContact}
                        onChange={(e) => setTicketContact(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as SupportCategory)}
                      className="w-full bg-[#1e1a15] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
                    >
                      {SUPPORT_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Sunday Pool payout help"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Message</label>
                    <textarea
                      rows={3}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Tell us how we can help..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400/60 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquareHeart className="w-4 h-4" />
                    {submittingTicket ? 'Sending...' : 'Send to Admin'}
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-3 sm:right-6 z-50 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Support</span>
        </button>
      )}
    </>
     );
};
