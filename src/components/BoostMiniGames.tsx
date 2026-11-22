import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Coins,
  Crown,
  Drama,
  ExternalLink,
  Gem,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { MONETAG_LINK } from '../constants';
import { useSponsorVisibilityTimers } from '../utils/useSponsorVisibilityTimer';

const GAME_SPONSOR_VERIFY_DURATION_MS = 20_000;

interface TriviaQuestion {
  prompt: string;
  category: 'Riddle' | 'Pop Culture' | 'Story & Drama';
  options: [string, string, string, string];
  correctIndex: number;
}

const TRIVIA_QUESTION_POOL: TriviaQuestion[] = [
  {
    prompt: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?',
    category: 'Riddle',
    options: ['A Shadow', 'An Echo', 'A Whisper', 'A Melody'],
    correctIndex: 1,
  },
  {
    prompt: 'What gets wetter the more it dries?',
    category: 'Riddle',
    options: ['A Sponge', 'A Cloud', 'A Towel', 'Rain'],
    correctIndex: 2,
  },
  {
    prompt: 'In classic drama tropes, which twist reveals a supposedly ordinary stranger is actually the heir to a fortune?',
    category: 'Story & Drama',
    options: ['Red Herring', 'Secret Billionaire Reveal', 'Chekhov’s Prop', 'Breaking the Fourth Wall'],
    correctIndex: 1,
  },
  {
    prompt: 'Which 2021 South Korean survival drama became Netflix’s most-watched series globally?',
    category: 'Pop Culture',
    options: ['All of Us Are Dead', 'Kingdom', 'Squid Game', 'Sweet Home'],
    correctIndex: 2,
  },
  {
    prompt: 'The more you take away from me, the bigger I grow. What am I?',
    category: 'Riddle',
    options: ['A Secret', 'A Hole', 'Debt', 'A Mountain'],
    correctIndex: 1,
  },
  {
    prompt: 'What is a dramatic episode ending designed to leave viewers eager for the next episode called?',
    category: 'Story & Drama',
    options: ['Prologue', 'Cliffhanger', 'Epilogue', 'Monologue'],
    correctIndex: 1,
  },
  {
    prompt: 'Which iconic anime hero aims to become the King of the Pirates?',
    category: 'Pop Culture',
    options: ['Naruto Uzumaki', 'Monkey D. Luffy', 'Ichigo Kurosaki', 'Goku'],
    correctIndex: 1,
  },
  {
    prompt: 'I have keys that open no locks, space without a room, and allow you to enter without going inside. What am I?',
    category: 'Riddle',
    options: ['A Piano', 'A Map', 'A Keyboard', 'A Treasure Chest'],
    correctIndex: 2,
  },
  {
    prompt: 'In theater and screenwriting, what does the "Comedy & Tragedy" twin-mask symbol represent?',
    category: 'Story & Drama',
    options: ['Silent Film Era', 'Performing Arts & Drama', 'Box Office Awards', 'Stage Lighting'],
    correctIndex: 1,
  },
  {
    prompt: 'Which K-pop superstar group released the global hit "Dynamite"?',
    category: 'Pop Culture',
    options: ['EXO', 'BLACKPINK', 'BTS', 'SEVENTEEN'],
    correctIndex: 2,
  },
  {
    prompt: 'What has cities, mountains, and water, yet has no houses, trees, or fish?',
    category: 'Riddle',
    options: ['A Globe / Map', 'A Dream', 'A Painting', 'A Mirage'],
    correctIndex: 0,
  },
  {
    prompt: 'What literary device hints at a major plot event that happens later in the story?',
    category: 'Story & Drama',
    options: ['Flashback', 'Foreshadowing', 'Soliloquy', 'Parody'],
    correctIndex: 1,
  },
  {
    prompt: 'In Jujutsu Kaisen, which blindfolded sorcerer wields the Limitless technique?',
    category: 'Pop Culture',
    options: ['Megumi Fushiguro', 'Yuta Okkotsu', 'Satoru Gojo', 'Kento Nanami'],
    correctIndex: 2,
  },
  {
    prompt: 'If you drop a yellow hat in the Red Sea, what does it become?',
    category: 'Riddle',
    options: ['Orange', 'Wet', 'Gold', 'Invisible'],
    correctIndex: 1,
  },
  {
    prompt: 'Which South Korean film made Oscars history as the first non-English movie to win Best Picture?',
    category: 'Pop Culture',
    options: ['Oldboy', 'Train to Busan', 'Minari', 'Parasite'],
    correctIndex: 3,
  },
];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface MiniGameSponsorClaimGateProps {
  rewardAmount: number;
  awardedCoins: number | null;
  resetNonce: number;
  onCompleteSponsorClaim: () => Promise<void>;
  onPlayAgain: () => void;
}

const MiniGameSponsorClaimGate: React.FC<MiniGameSponsorClaimGateProps> = ({
  rewardAmount,
  awardedCoins,
  resetNonce,
  onCompleteSponsorClaim,
  onPlayAgain,
}) => {
  const onCompleteRef = useRef(onCompleteSponsorClaim);

  useEffect(() => {
    onCompleteRef.current = onCompleteSponsorClaim;
  }, [onCompleteSponsorClaim]);

  const { timers, startTimer, cancelTimer, resetAllTimers } =
    useSponsorVisibilityTimers<'claim'>(async () => {
      await onCompleteRef.current();
    });

  useEffect(() => {
    resetAllTimers();
  }, [resetNonce, resetAllTimers]);

  const activeTimer = timers.claim;

  if (awardedCoins !== null) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-emerald-950/45 border border-emerald-400/60 px-3 py-2.5 text-xs font-mono-num font-bold text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.22)]">
          +{awardedCoins} Coins added to your Daily Game Coins!
        </div>
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full min-h-[42px] rounded-full gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Play Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-gradient-to-r from-[#231B09] via-[#191308] to-[#231B09] border border-[#FBBF24]/70 p-3 space-y-2.5 shadow-[0_0_24px_rgba(212,175,55,0.24)]">
        <div className="text-[11px] font-mono-num font-bold text-[#FCE7A2] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
          <span>Sponsor Check Required to Unlock +{rewardAmount} Coins</span>
        </div>

        {activeTimer ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled
              className="relative overflow-hidden flex-1 min-h-[44px] px-3.5 rounded-full bg-[#151109] border-2 border-[#D4AF37]/80 text-[#FFF8E7] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-wait font-mono-num shadow-[0_0_18px_rgba(212,175,55,0.35)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                style={{ width: `${activeTimer.progressPct}%` }}
              />
              <span className="relative z-10 inline-flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#FFF3B0]" />
                <span>
                  {activeTimer.isCompleting
                    ? 'Crediting Coins...'
                    : `Verifying... ${activeTimer.secondsLeft}s`}
                </span>
              </span>
            </button>

            {!activeTimer.isCompleting && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelTimer('claim');
                }}
                aria-label="Cancel sponsor verification"
                title="Cancel verification"
                className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/60 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <a
            href={MONETAG_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => startTimer('claim', GAME_SPONSOR_VERIFY_DURATION_MS)}
            className="w-full min-h-[44px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.55)] border border-[#FFF3B0] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Visit Sponsor to Claim +{rewardAmount} Coins (20s)</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        )}
      </div>

      {!activeTimer && (
        <button
          type="button"
          onClick={onPlayAgain}
          className="text-[11px] font-semibold text-[#8D867A] hover:text-[#FCE7A2] inline-flex items-center justify-center gap-1 py-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Skip Claim &amp; Play Again</span>
        </button>
      )}
    </div>
  );
};

/* ============================================================================
 * 1) INLINE DRAMA & RIDDLE TRIVIA (Rendered Directly On-Screen)
 * ========================================================================== */

interface InlineDramaTriviaGameProps {
  dailyCapReached: boolean;
  playsRemaining: number;
  rewardAmount: number;
  onConsumePlay: () => boolean;
  onWin: (awardBaseCoins: number) => Promise<number>;
}

export const InlineDramaTriviaGame: React.FC<InlineDramaTriviaGameProps> = ({
  dailyCapReached,
  playsRemaining,
  rewardAmount,
  onConsumePlay,
  onWin,
}) => {
  const [questions, setQuestions] = useState<TriviaQuestion[]>(() =>
    shuffleArray(TRIVIA_QUESTION_POOL).slice(0, 3)
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [awardedCoins, setAwardedCoins] = useState<number | null>(null);
  const [roundMode, setRoundMode] = useState<'idle' | 'paid' | 'fun'>('idle');
  const [lockedRoundReward, setLockedRoundReward] = useState(rewardAmount);
  const [roundNonce, setRoundNonce] = useState(0);

  const advancingRef = useRef(false);
  const onWinRef = useRef(onWin);
  const roundModeRef = useRef(roundMode);
  const lockedRewardRef = useRef(lockedRoundReward);

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  useEffect(() => {
    roundModeRef.current = roundMode;
  }, [roundMode]);

  useEffect(() => {
    lockedRewardRef.current = lockedRoundReward;
  }, [lockedRoundReward]);

  const startFreshRound = useCallback(() => {
    setQuestions(shuffleArray(TRIVIA_QUESTION_POOL).slice(0, 3));
    setQuestionIndex(0);
    setSecondsLeft(15);
    setSelectedIdx(null);
    setScore(0);
    setFinished(false);
    setAwardedCoins(null);
    setRoundMode('idle');
    roundModeRef.current = 'idle';
    setLockedRoundReward(rewardAmount);
    lockedRewardRef.current = rewardAmount;
    setRoundNonce((prev) => prev + 1);
    advancingRef.current = false;
  }, [rewardAmount]);

  const advanceRound = useCallback(
    (nextScore: number) => {
      if (questionIndex + 1 >= 3) {
        setFinished(true);
        const isPaid = roundModeRef.current === 'paid';
        if (nextScore < 2 || !isPaid) {
          setAwardedCoins(0);
        }
      } else {
        setQuestionIndex((prev) => prev + 1);
        setSelectedIdx(null);
        setSecondsLeft(15);
      }
      advancingRef.current = false;
    },
    [questionIndex]
  );

  // Live 15-second countdown timer per question
  useEffect(() => {
    if (finished || selectedIdx !== null || questions.length === 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (!advancingRef.current) {
            advancingRef.current = true;
            setSelectedIdx(-1);
            window.setTimeout(() => {
              advanceRound(score);
            }, 850);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [finished, selectedIdx, questions.length, advanceRound, score]);

  const currentQuestion = questions[questionIndex];
  if (!currentQuestion) return null;

  const won = finished && score >= 2;
  const isPaidRound =
    roundMode === 'paid' || (roundMode === 'idle' && !dailyCapReached && playsRemaining > 0);

  const handleSelectOption = (idx: number) => {
    if (selectedIdx !== null || finished || advancingRef.current) return;

    if (roundModeRef.current === 'idle') {
      if (dailyCapReached || playsRemaining <= 0) {
        setRoundMode('fun');
        roundModeRef.current = 'fun';
      } else {
        const snapshotReward = rewardAmount;
        const ok = onConsumePlay();
        if (ok) {
          setLockedRoundReward(snapshotReward);
          lockedRewardRef.current = snapshotReward;
          setRoundMode('paid');
          roundModeRef.current = 'paid';
        } else {
          setRoundMode('fun');
          roundModeRef.current = 'fun';
        }
      }
    }

    advancingRef.current = true;
    setSelectedIdx(idx);
    const isRight = idx === currentQuestion.correctIndex;
    const nextScore = isRight ? score + 1 : score;
    if (isRight) setScore(nextScore);

    window.setTimeout(() => {
      advanceRound(nextScore);
    }, 850);
  };

  const handleCompleteTriviaSponsorClaim = useCallback(async () => {
    const coinsEarned = await onWinRef.current(lockedRewardRef.current);
    setAwardedCoins(coinsEarned);
  }, []);

  if (finished) {
    return (
      <div className="rounded-xl bg-[#09090D] border border-[#D4AF37]/45 p-4 text-center space-y-3">
        <div className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center gold-gradient-bg text-[#181307] shadow-[0_0_16px_rgba(212,175,55,0.35)]">
          {won ? <Trophy className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-display font-bold text-[#FCE7A2]">
            {won ? 'Trivia Victory!' : 'Good Effort!'}
          </h3>
          <p className="text-xs sm:text-sm text-[#C4BDB0]">
            You answered <strong className="text-white">{score} / 3</strong> questions correctly.
          </p>
          {won && roundMode !== 'paid' && (
            <p className="text-xs font-mono-num font-bold text-emerald-300 pt-0.5">
              {dailyCapReached
                ? 'Fun Mode complete (Daily 1,000 game coin cap reached).'
                : 'Fun Mode complete (Unlock extra paid plays above).'}
            </p>
          )}
          {!won && (
            <p className="text-xs text-[#8D867A]">
              Score at least 2 / 3 correct answers to win the coin drop.
            </p>
          )}
        </div>

        {won && roundMode === 'paid' ? (
          <MiniGameSponsorClaimGate
            rewardAmount={lockedRoundReward}
            awardedCoins={awardedCoins}
            resetNonce={roundNonce}
            onCompleteSponsorClaim={handleCompleteTriviaSponsorClaim}
            onPlayAgain={startFreshRound}
          />
        ) : (
          <button
            type="button"
            onClick={startFreshRound}
            className="w-full min-h-[42px] rounded-full gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Play Again</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Live Question Status + Countdown Timer */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono-num">
        <span className="text-[#E8C96D] font-bold">
          Question {questionIndex + 1} / 3 · {currentQuestion.category}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startFreshRound}
            aria-label="New question set"
            title="New question set"
            className="text-[11px] text-[#A69F91] hover:text-[#FCE7A2] inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <span
            className={`inline-flex items-center gap-1 font-extrabold px-2.5 py-0.5 rounded-full border ${
              secondsLeft <= 5
                ? 'bg-red-950/60 border-red-500/60 text-red-300'
                : 'bg-[#17130A] border-[#D4AF37]/50 text-[#FCE7A2]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{secondsLeft}s</span>
          </span>
        </div>
      </div>

      {/* Live Question Box */}
      <div className="rounded-xl bg-[#09090D] border border-[#D4AF37]/30 px-3.5 py-3">
        <p className="text-xs sm:text-sm font-semibold text-[#F6F2E9] leading-relaxed">
          {currentQuestion.prompt}
        </p>
      </div>

      {/* 4 Clickable Gold-Bordered Answer Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === currentQuestion.correctIndex;
          const reveal = selectedIdx !== null;

          let pillStyle =
            'bg-[#131009] border-[#D4AF37]/55 text-[#F6F2E9] hover:border-[#FCE7A2] hover:bg-[#1E190C]';
          if (reveal) {
            if (isCorrect) {
              pillStyle = 'bg-emerald-950/60 border-emerald-400/80 text-emerald-200';
            } else if (isSelected) {
              pillStyle = 'bg-red-950/60 border-red-400/80 text-red-200';
            } else {
              pillStyle = 'bg-[#0C0C11] border-white/[0.08] text-[#7A746A]';
            }
          }

          return (
            <button
              key={option}
              type="button"
              disabled={selectedIdx !== null}
              onClick={() => handleSelectOption(idx)}
              className={`w-full min-h-[44px] px-4 py-2 rounded-full border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer disabled:cursor-default active:scale-[0.98] ${pillStyle}`}
            >
              <span className="truncate">
                <strong className="font-mono-num text-[#D4AF37] mr-1.5">
                  {String.fromCharCode(65 + idx)}.
                </strong>
                {option}
              </span>
              {reveal && isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {reveal && isSelected && !isCorrect && (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-[#8D867A] font-mono-num flex items-center justify-between">
        <span>Score: {score} / 3 (Need 2/3 to win)</span>
        <span className="text-[#FCE7A2] font-bold">
          {isPaidRound ? `+${roundMode === 'paid' ? lockedRoundReward : rewardAmount} Coins` : 'Fun Mode'}
        </span>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2) INLINE GOLD MEMORY MATCH (Live 3x4 Grid of 12 Gold Cards On-Screen)
 * ========================================================================== */

type MemoryIconId = 'trophy' | 'crown' | 'drama' | 'coins' | 'gem' | 'star';

interface MemoryCardItem {
  uid: string;
  pairId: MemoryIconId;
  label: string;
}

const MEMORY_PAIRS: { pairId: MemoryIconId; label: string }[] = [
  { pairId: 'trophy', label: 'Trophy' },
  { pairId: 'crown', label: 'Crown' },
  { pairId: 'drama', label: 'Drama Mask' },
  { pairId: 'coins', label: 'Gold Coin' },
  { pairId: 'gem', label: 'Diamond' },
  { pairId: 'star', label: 'VIP Star' },
];

function buildShuffledMemoryDeck(): MemoryCardItem[] {
  const doubled: MemoryCardItem[] = [];
  MEMORY_PAIRS.forEach((p) => {
    doubled.push({ uid: `${p.pairId}-a-${Math.random()}`, pairId: p.pairId, label: p.label });
    doubled.push({ uid: `${p.pairId}-b-${Math.random()}`, pairId: p.pairId, label: p.label });
  });
  return shuffleArray(doubled);
}

const MemoryIconGlyph: React.FC<{ pairId: MemoryIconId; className?: string }> = ({
  pairId,
  className = 'w-5 h-5',
}) => {
  switch (pairId) {
    case 'trophy':
      return <Trophy className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'drama':
      return <Drama className={className} />;
    case 'coins':
      return <Coins className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'star':
      return <Star className={className} />;
  }
};

interface InlineGoldMemoryMatchProps {
  dailyCapReached: boolean;
  playsRemaining: number;
  rewardAmount: number;
  onConsumePlay: () => boolean;
  onWin: (awardBaseCoins: number) => Promise<number>;
}

export const InlineGoldMemoryMatch: React.FC<InlineGoldMemoryMatchProps> = ({
  dailyCapReached,
  playsRemaining,
  rewardAmount,
  onConsumePlay,
  onWin,
}) => {
  const [deck, setDeck] = useState<MemoryCardItem[]>(() => buildShuffledMemoryDeck());
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<MemoryIconId[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);
  const [lockedBoard, setLockedBoard] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [awardedCoins, setAwardedCoins] = useState<number | null>(null);
  const [roundMode, setRoundMode] = useState<'idle' | 'paid' | 'fun'>('idle');
  const [lockedRoundReward, setLockedRoundReward] = useState(rewardAmount);
  const [roundNonce, setRoundNonce] = useState(0);

  const onWinRef = useRef(onWin);
  const roundModeRef = useRef(roundMode);
  const lockedRewardRef = useRef(lockedRoundReward);

  useEffect(() => {
    onWinRef.current = onWin;
  }, [onWin]);

  useEffect(() => {
    roundModeRef.current = roundMode;
  }, [roundMode]);

  useEffect(() => {
    lockedRewardRef.current = lockedRoundReward;
  }, [lockedRoundReward]);

  const startFreshRound = useCallback(() => {
    setDeck(buildShuffledMemoryDeck());
    setFlippedIndices([]);
    setMatchedPairs([]);
    setSecondsLeft(30);
    setTimerStarted(false);
    setLockedBoard(false);
    setStatus('playing');
    setAwardedCoins(null);
    setRoundMode('idle');
    roundModeRef.current = 'idle';
    setLockedRoundReward(rewardAmount);
    lockedRewardRef.current = rewardAmount;
    setRoundNonce((prev) => prev + 1);
  }, [rewardAmount]);

  // 30-second countdown timer begins on first card flip
  useEffect(() => {
    if (!timerStarted || status !== 'playing') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setStatus('lost');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerStarted, status]);

  const handleCardClick = (index: number) => {
    if (status !== 'playing' || lockedBoard) return;
    const clickedCard = deck[index];
    if (!clickedCard) return;
    if (flippedIndices.includes(index) || matchedPairs.includes(clickedCard.pairId)) return;

    if (!timerStarted) {
      setTimerStarted(true);
    }

    if (roundModeRef.current === 'idle') {
      if (dailyCapReached || playsRemaining <= 0) {
        setRoundMode('fun');
        roundModeRef.current = 'fun';
      } else {
        const snapshotReward = rewardAmount;
        const ok = onConsumePlay();
        if (ok) {
          setLockedRoundReward(snapshotReward);
          lockedRewardRef.current = snapshotReward;
          setRoundMode('paid');
          roundModeRef.current = 'paid';
        } else {
          setRoundMode('fun');
          roundModeRef.current = 'fun';
        }
      }
    }

    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length < 2) return;

    const firstCard = deck[nextFlipped[0]];
    const secondCard = deck[nextFlipped[1]];
    if (!firstCard || !secondCard) return;

    if (firstCard.pairId === secondCard.pairId) {
      const nextMatched = [...matchedPairs, firstCard.pairId];
      setMatchedPairs(nextMatched);
      setFlippedIndices([]);

      if (nextMatched.length >= MEMORY_PAIRS.length) {
        setStatus('won');
        if (roundModeRef.current !== 'paid') {
          setAwardedCoins(0);
        }
      }
      return;
    }

    setLockedBoard(true);
    window.setTimeout(() => {
      setFlippedIndices([]);
      setLockedBoard(false);
    }, 550);
  };

  const isPaidRound =
    roundMode === 'paid' || (roundMode === 'idle' && !dailyCapReached && playsRemaining > 0);

  return (
    <div className="space-y-3">
      {/* Live Pairs & 30s Timer Header */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono-num">
        <span className="text-[#E8C96D] font-bold">
          Pairs: {matchedPairs.length} / {MEMORY_PAIRS.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startFreshRound}
            aria-label="Reset cards"
            className="text-[11px] text-[#A69F91] hover:text-[#FCE7A2] inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <span
            className={`inline-flex items-center gap-1 font-extrabold px-2.5 py-0.5 rounded-full border ${
              secondsLeft <= 8
                ? 'bg-red-950/60 border-red-500/60 text-red-300'
                : 'bg-[#17130A] border-[#D4AF37]/50 text-[#FCE7A2]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{secondsLeft}s</span>
          </span>
        </div>
      </div>

      {/* Live 3x4 Grid (12 Clickable Tactile Gold Cards) */}
      <div className="grid grid-cols-3 gap-2.5">
        {deck.map((card, index) => {
          const isMatched = matchedPairs.includes(card.pairId);
          const isFaceUp = isMatched || flippedIndices.includes(index);

          return (
            <button
              key={card.uid}
              type="button"
              disabled={status !== 'playing' || isFaceUp}
              onClick={() => handleCardClick(index)}
              aria-label={isFaceUp ? card.label : `Flip card ${index + 1}`}
              className={`relative h-[70px] sm:h-[78px] rounded-xl flex flex-col items-center justify-center gap-1 overflow-hidden transition-all duration-150 cursor-pointer disabled:cursor-default ${
                isMatched
                  ? 'bg-gradient-to-br from-[#34D399] via-[#10B981] to-[#059669] border-2 border-[#D1FAE5] text-white shadow-[0_0_24px_rgba(16,185,129,0.78),inset_0_1px_0_rgba(255,255,255,0.65)] memory-card-matched-pop'
                  : isFaceUp
                    ? 'bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#4338CA] border-2 border-[#FEF08A] text-white shadow-[0_0_22px_rgba(253,224,71,0.55),inset_0_1px_0_rgba(255,255,255,0.5)] scale-[1.02]'
                    : 'bg-gradient-to-br from-[#FDE68A] via-[#D4AF37] to-[#9A6E12] border-2 border-[#FFF3B0] text-[#1C1404] shadow-[0_4px_0_#6B4A08,0_8px_18px_rgba(212,175,55,0.34),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#6B4A08]'
              }`}
            >
              {/* Glossy top card highlight */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
              />

              {isFaceUp ? (
                <>
                  <MemoryIconGlyph
                    pairId={card.pairId}
                    className={`relative w-6 h-6 sm:w-7 sm:h-7 ${
                      isMatched
                        ? 'text-white drop-shadow-[0_2px_6px_rgba(6,78,59,0.5)]'
                        : 'text-[#FEF08A] drop-shadow-[0_0_10px_rgba(254,240,138,0.65)]'
                    }`}
                  />
                  <span className="relative text-[10px] font-extrabold tracking-tight leading-none text-white drop-shadow-sm">
                    {card.label}
                  </span>
                </>
              ) : (
                <div className="relative flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#241804]/85 border border-[#FFF3B0]/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.28)] flex items-center justify-center text-[#FCE7A2]">
                    <Crown className="w-4 h-4" />
                  </div>
                  <Sparkles className="w-3 h-3 text-[#FFFBEB] absolute -top-1 -right-1.5 drop-shadow-[0_1px_2px_rgba(120,53,15,0.9)]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {status === 'playing' ? (
        <div className="text-[11px] text-[#8D867A] font-mono-num flex items-center justify-between">
          <span>{timerStarted ? 'Match all 6 pairs before time runs out' : 'Tap any gold card to start'}</span>
          <span className="text-[#FCE7A2] font-bold">
            {isPaidRound ? `+${roundMode === 'paid' ? lockedRoundReward : rewardAmount} Coins` : 'Fun Mode'}
          </span>
        </div>
      ) : (
        <div className="rounded-xl bg-[#09090D] border border-[#D4AF37]/45 p-3.5 text-center space-y-2.5">
          <h4 className="text-base font-display font-bold text-[#FCE7A2]">
            {status === 'won' ? '🏆 Board Cleared!' : '⏰ Time’s Up!'}
          </h4>
          {status === 'won' && roundMode === 'paid' ? (
            <>
              <p className="text-xs text-[#C4BDB0]">
                All 6 pairs matched! Complete the quick sponsor verification to collect your{' '}
                <strong className="text-[#FCE7A2]">+{lockedRoundReward} Coins</strong>.
              </p>
              <MiniGameSponsorClaimGate
                rewardAmount={lockedRoundReward}
                awardedCoins={awardedCoins}
                resetNonce={roundNonce}
                onCompleteSponsorClaim={async () => {
                  const coinsEarned = await onWinRef.current(lockedRewardRef.current);
                  setAwardedCoins(coinsEarned);
                }}
                onPlayAgain={startFreshRound}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-[#C4BDB0]">
                {status === 'won'
                  ? dailyCapReached
                    ? 'All 6 pairs matched! (Daily 1,000 game coin cap reached.)'
                    : 'All 6 pairs matched! (Fun Mode — unlock extra paid plays above.)'
                  : `You matched ${matchedPairs.length} / ${MEMORY_PAIRS.length} pairs before time ran out.`}
              </p>
              <button
                type="button"
                onClick={startFreshRound}
                className="w-full min-h-[42px] rounded-full gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3) PAID SURVEYS FULL-SCREEN IFRAME MODAL (CPX Research Ready)
 * ========================================================================== */

interface PaidSurveyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PaidSurveyModal: React.FC<PaidSurveyModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paid Surveys Offerwall"
      className="fixed inset-0 z-[2147483590] bg-[#09090b] flex flex-col w-full h-full overflow-hidden"
    >
      <header className="shrink-0 bg-[#12100B] border-b border-[#D4AF37]/40 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-display font-bold text-[#FCE7A2] truncate">
              📋 Paid Surveys (Up to +5,000 Coins)
            </h3>
            <p className="text-[11px] text-[#A69F91] truncate">
              Complete partner surveys to earn Sunday Tournament coins
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-xs font-bold text-[#F6F2E9] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>Close</span>
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 w-full bg-[#09090b] relative overflow-hidden">
        {/* <!-- REPLACE WITH CPX RESEARCH OFFERWALL URL --> */}
        <iframe
          src="https://cpx-research.com"
          title="Paid Surveys Offerwall"
          className="w-full h-full border-0 block bg-[#09090b]"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
};
