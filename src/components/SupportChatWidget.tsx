import React, { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { DEFAULT_QUALIFICATION_THRESHOLD, MYSTERY_CYCLE_BOXES } from '../constants';

const CHAT_STORAGE_KEY = 'dramawin_support_chat_v1';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_ACCESS_KEY = '1cf6a6bd-bbe1-44ae-94ca-5ee93136033e';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface SupportChatWidgetProps {
  username: string;
  contact: string;
  coins: number;
  weeklyCoins: number;
  qualificationThreshold?: number;
  poolPrizeZar: number;
  firebaseEmail?: string | null;
  open?: boolean;
  onClose?: () => void;
  hideFloatingButton?: boolean;
}

const QUICK_PROMPTS = [
  'How do I earn coins fast?',
  'How does the Mystery Vault work?',
  'Am I qualified for Sunday Pool?',
  'Missing coins / prize help',
];

function resolveInitialEmail(firebaseEmail?: string | null, contact?: string): string {
  if (firebaseEmail && firebaseEmail.includes('@')) return firebaseEmail.trim();
  if (contact && contact !== 'Instant Play' && contact.includes('@')) return contact.trim();
  return '';
}

function buildConversationalReply(
  question: string,
  ctx: {
    username: string;
    coins: number;
    weeklyCoins: number;
    qualificationThreshold: number;
    poolPrizeZar: number;
  }
): string {
  const q = question.toLowerCase().trim();
  const firstName =
    ctx.username && ctx.username !== 'Player' ? ctx.username.split(' ').at(0) : 'friend';
  const safeThreshold = Math.max(1, ctx.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD);
  const currentWeekly = ctx.weeklyCoins || 0;
  const remainingWeekly = Math.max(0, safeThreshold - currentWeekly);
  const progressPct = Math.min(100, Math.round((currentWeekly / safeThreshold) * 100));

  if (/\b(thank|thanks|thx|appreciate|awesome|cool|sharp|shot|perfect|nice)\b/.test(q)) {
    return `You're welcome, ${firstName}! Enjoy watching and stacking those coins. Shout anytime if you need anything else!`;
  }

  if (q.includes('how are you') || q.includes('howzit') || q.includes("what's up") || q.includes('wassup')) {
    return `Doing great, ${firstName}! I see you've got ${ctx.coins.toLocaleString()} Coins in your wallet right now. Want tips on boosting your balance or checking your Sunday Pool progress?`;
  }

  if (/^(hi|hello|hey|yo|ekse|heita|hola|good morning|good afternoon|good evening)\b/.test(q)) {
    return `Hey ${firstName}! Welcome to DramaWin VIP Support. You currently have ${ctx.coins.toLocaleString()} Coins—what can I help you with today?`;
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
    return `I'm sorry you're running into trouble, ${firstName}! I've forwarded your message directly to our admin team along with your email above so we can review your ${ctx.coins.toLocaleString()} Coins balance and reply as soon as possible. Feel free to include any extra details or your WhatsApp number right here in the chat!`;
  }

  if (
    q.includes('11') ||
    q.includes('12') ||
    q.includes('mystery') ||
    q.includes('box') ||
    q.includes('boost') ||
    q.includes('vault') ||
    q.includes('reset')
  ) {
    return `Here is how the Secret Mystery Vault works, ${firstName}:\n\n1. Tap any of the ${MYSTERY_CYCLE_BOXES} glowing gift boxes to explore a partner offer.\n2. Find the hidden jackpot box to win +1,000 Coins straight into your wallet!\n3. Once all ${MYSTERY_CYCLE_BOXES} boxes are opened, the vault grid automatically resets back to Box #1.`;
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
    return `You already have ${ctx.coins.toLocaleString()} Coins, ${firstName}! Here are the best ways to stack more fast:\n\n• Watch Episodes: Fill the 60s Coin Pot (+300 Coins) or double it to +600 Coins with AD Double Rewards.\n• Lucky Spin Wheel: Spin daily to win up to +1,000 Coins or a Free Respin.\n• Mystery Vault: Hunt through ${MYSTERY_CYCLE_BOXES} glowing boxes for the hidden +1,000 Coins gift!\n• Daily Streak: Visit the Rewards tab once a day to claim your streak bonus.`;
  }

  if (
    q.includes('sunday') ||
    q.includes('pool') ||
    q.includes('payout') ||
    q.includes('qualif') ||
    q.includes('leaderboard') ||
    q.includes('winner') ||
    q.includes('prize') ||
    q.includes('claim')
  ) {
    const progressLine =
      remainingWeekly === 0
        ? `Great news—you've already hit ${currentWeekly.toLocaleString()} weekly coins and are 100% qualified!`
        : `You're currently at ${progressPct}% (${currentWeekly.toLocaleString()} / ${safeThreshold.toLocaleString()} weekly coins), so you just need ${remainingWeekly.toLocaleString()} more weekly coins to qualify.`;
    const poolCoins = (ctx.poolPrizeZar >= 1000 ? ctx.poolPrizeZar : ctx.poolPrizeZar * 1000).toLocaleString();

    return `Every Sunday at 23:59 SAST, the Top 3 qualified players (500,000+ weekly coins) share the ${poolCoins} Coins Sunday Pool (50% for 1st, 30% for 2nd, 20% for 3rd).\n\n${progressLine}\n\nYour message is also automatically sent to our support inbox if you need help from our team!`;
  }

  if (q.includes('sound') || q.includes('volume') || q.includes('audio') || q.includes('mute') || q.includes('video')) {
    return `If a drama has no sound, tap the speaker icon near the top of the video player to unmute it and check your phone's media volume. If the stream stalls on mobile data, tap "Buffering? Reload Video" in the top corner. Your note has also been forwarded to our support team!`;
  }

  return `Got it, ${firstName}! I can help with earning coins, the ${MYSTERY_CYCLE_BOXES}-box Mystery Vault, or Sunday Pool payouts—and a copy of your message has also been sent straight to our support team so an admin can reply to your email if needed.`;
}

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  username,
  contact,
  coins,
  weeklyCoins,
  qualificationThreshold = DEFAULT_QUALIFICATION_THRESHOLD,
  poolPrizeZar,
  firebaseEmail = null,
  open: controlledOpen,
  onClose,
  hideFloatingButton = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen !== undefined) {
      if (!next) onClose?.();
    } else {
      setInternalOpen(next);
    }
  };

  const getInitialMessage = (): ChatMessageItem => {
    const firstName = username && username !== 'Player' ? username.split(' ').at(0) : 'there';

    return {
      id: 'welcome-bot',
      role: 'assistant',
      text: `Hey ${firstName}! 👋 I'm your DramaWin VIP Assistant. Ask me anything about your Coins, the Secret Mystery Vault, or the Sunday Coin Tournament!`,
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

  const [userEmail, setUserEmail] = useState<string>(() =>
    resolveInitialEmail(firebaseEmail, contact)
  );
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  useEffect(() => {
    const detected = resolveInitialEmail(firebaseEmail, contact);
    if (detected) {
      setUserEmail((prev) => (prev.trim() ? prev : detected));
    }
  }, [contact, firebaseEmail]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, messages, isTyping]);

  const submitCopyToWeb3Forms = async (userMessage: string) => {
    const replyEmail =
      userEmail.trim() ||
      resolveInitialEmail(firebaseEmail, contact) ||
      'no-reply@dramawin.app';

    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'DramaWin Support Ticket',
        replyto: replyEmail,
        email: replyEmail,
        from_name: username || 'DramaWin Player',
        message: [
          userMessage,
          '',
          `--- Player Context ---`,
          `Player: ${username || 'Player'}`,
          `Reply Email: ${replyEmail}`,
          contact && contact !== 'Instant Play' ? `Contact: ${contact}` : '',
          `Coins: ${coins.toLocaleString()} (Weekly: ${weeklyCoins.toLocaleString()})`,
        ]
          .filter(Boolean)
          .join('\n'),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  };

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

    // Silently forward a copy via Web3Forms in the background without interrupting chat
    void submitCopyToWeb3Forms(trimmed).catch(() => {});

    window.setTimeout(() => {
      const replyText = buildConversationalReply(trimmed, {
        username,
        coins,
        weeklyCoins,
        qualificationThreshold,
        poolPrizeZar,
      });

      const botMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: replyText,
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

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-x-2 bottom-20 top-14 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[390px] sm:h-[540px] z-[80] flex flex-col">
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
                    {coins.toLocaleString()} Coins · {(poolPrizeZar >= 1000 ? poolPrizeZar : poolPrizeZar * 1000).toLocaleString()} Coins Sunday Pool
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear chat"
                    aria-label="Clear chat"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-white/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Support"
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-white/5 hover:bg-white/15 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI Assistant Chat Messages */}
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

            {/* Quick-Reply Chips */}
            <div className="px-3 py-1.5 border-t border-white/5 bg-[#15120e] flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendAiPrompt(prompt)}
                  className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-amber-400/20 border border-amber-400/25 text-amber-200 transition shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Your Email + Ask a question Input Bar */}
            <form
              onSubmit={handleChatSubmit}
              className="p-2.5 bg-[#1a1612] border-t border-white/10 space-y-2 shrink-0"
            >
              <div>
                <label
                  htmlFor="support-chat-email"
                  className="block text-[10px] font-semibold text-zinc-400 mb-1"
                >
                  Your Email (so we can reply)
                </label>
                <input
                  id="support-chat-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-400/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
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
                  className="p-2 rounded-xl bg-amber-400 text-black hover:bg-amber-300 transition shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : hideFloatingButton ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-36 right-3 sm:right-6 z-50 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Assistant</span>
        </button>
      )}
    </>
  );
};
