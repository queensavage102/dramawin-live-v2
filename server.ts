import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

interface ChatTurnInput {
  role: 'user' | 'assistant';
  text: string;
}

interface PlayerContextInput {
  username?: string;
  coins?: number;
  weeklyCoins?: number;
  qualificationThreshold?: number;
  poolPrizeZar?: number;
}

const SYSTEM_INSTRUCTION = `You are the VIP Support Assistant for DRAMA WIN TORNEMENT (DramaWin Coins), a dark-luxury short-drama rewards app.
Answer clearly, concisely, and warmly in plain text (short paragraphs or crisp bullet points). Only state verified app rules:

1. Earning Coins:
- Watch Episodes: Watch any featured short drama episode for 30+ seconds to activate the 60-second Coin Pot, which awards +100 to +300 Coins per cycle.
- Daily Check-In Streak (Mon–Sun): Visit the Rewards tab and tap Claim on today's card to visit the sponsor and collect +100 to +300 Coins.
- Hero Carousel & Sponsor Banners: Claim bonus coins when watching featured showcases.

2. 11-Ad R3 Mystery Box Progress Bar Boost & Auto-Reset Cycle:
- Tap any glowing box (#1–#12) in the Secret Mystery Vault (Rewards tab or top-right Gift button) and complete the 20-second sponsor video ad to reveal your box reward.
- Each box grants +100 Bonus Coins (or an occasional "Oops, try next box").
- On the 11th video ad & box claim in a cycle, you unlock the R3 Progress Bar Boost (+1,000 Bonus Coins toward your 500,000 Weekly Tournament goal!).
- Immediately after claiming the 11th box, the Mystery Box grid automatically resets back to Box #1 so you can repeat the 11-ad cycle right away without waiting until tomorrow.
- If an Admin awards a special R3 Boost Voucher win (DW-R3-...), it boosts the Sunday Pool by R3 and displays your redeemable voucher code.

3. Sunday Pool Payouts & Qualification:
- Weekly Goal: Earn 500,000 Weekly Coins before Sunday 23:59 SAST to qualify for the Sunday Prize Pool.
- Base Sunday Prize Pool starts at R50 and rolls over (+R50 each week) whenever fewer than 3 players reach 500,000 weekly coins.
- When 3+ players qualify by Sunday, the Top 3 split the Sunday Pool (50% for 1st, 30% for 2nd, 20% for 3rd).

4. Claiming Prizes & Contacting Admin:
- If the user wants to claim a prize payout, report an issue, or speak directly with Admin, tell them to tap the "Message Admin / Claim Prize Help" tab at the top of this chat widget to send a direct ticket that is saved and emailed to the DramaWin admin.`;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'dramawin-server' });
  });

  app.post('/api/support-chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'AI Assistant is unavailable because GEMINI_API_KEY is not configured. Please switch to "Message Admin / Claim Prize Help" to contact support directly.',
      });
      return;
    }

    const body = req.body as {
      messages?: ChatTurnInput[];
      playerContext?: PlayerContextInput;
    };

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const cleanedMessages = rawMessages
      .filter(
        (m): m is ChatTurnInput =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .slice(-12);

    if (cleanedMessages.length === 0) {
      res.status(400).json({ error: 'Please enter a support question.' });
      return;
    }

    const ctx = body?.playerContext;
    const contextSummary = ctx
      ? `\n\nActive Player Stats:\n- Username: ${String(ctx.username || 'Player').slice(0, 40)}\n- Wallet Coins: ${Number(ctx.coins || 0).toLocaleString()}\n- Weekly Coins: ${Number(ctx.weeklyCoins || 0).toLocaleString()} / ${Number(ctx.qualificationThreshold || 500000).toLocaleString()}\n- Active Sunday Pool: R${Number(ctx.poolPrizeZar || 50)}`
      : '';

    const contents = cleanedMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text.trim().slice(0, 2000) }],
    }));

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION}${contextSummary}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Support AI request timed out.')), 9000);
        }),
      ]);

      const reply = (response.text || '').trim();
      if (!reply) {
        res.status(502).json({
          error: 'No response generated by support assistant. Please try again.',
        });
        return;
      }

      res.json({ reply });
    } catch (err) {
      console.error('Gemini support chat error:', err);
      const message =
        err instanceof Error ? err.message : 'Support AI request failed.';
      res.status(502).json({
        error: `Support AI could not respond right now (${message}). You can use the "Message Admin / Claim Prize Help" tab to reach Admin directly.`,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`DramaWin server running at http://${HOST}:${PORT}`);
  });
}

void startServer();
