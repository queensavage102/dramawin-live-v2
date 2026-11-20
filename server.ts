import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'dramawin-server' });
  });

  app.get('/api/youtube-thumbnail', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || !/^https?:\/\/([^/]*\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(rawUrl)) {
      res.status(400).json({ error: 'Valid YouTube URL required.' });
      return;
    }
    try {
      const oembedResp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`,
        {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: 'application/json' },
        }
      );
      if (!oembedResp.ok) {
        res.status(404).json({ error: 'YouTube metadata not found.' });
        return;
      }
      const data = (await oembedResp.json()) as {
        thumbnail_url?: string;
        title?: string;
      };
      const rawThumb = (data.thumbnail_url || '').trim();
      const idMatch = rawThumb.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      const videoId = idMatch?.[1] || null;
      const posterUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        : rawThumb || null;
      const fallbackUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : rawThumb || null;
      res.json({ videoId, posterUrl, fallbackUrl, title: data.title || '' });
    } catch {
      res.status(502).json({ error: 'Failed to resolve YouTube thumbnail.' });
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
