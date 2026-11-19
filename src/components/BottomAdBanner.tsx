import React, { useEffect, useRef, useState } from 'react';

const AD_WIDTH = 320;
const AD_HEIGHT = 50;

const AD_SRC_DOC = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: ${AD_WIDTH}px;
        height: ${AD_HEIGHT}px;
        overflow: hidden;
        background-color: #09090b;
        color-scheme: dark;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      iframe, img, ins, div, a {
        max-width: ${AD_WIDTH}px !important;
        max-height: ${AD_HEIGHT}px !important;
      }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : 'c56306a7ff730db6775be12acff0f104',
        'format' : 'iframe',
        'height' : ${AD_HEIGHT},
        'width' : ${AD_WIDTH},
        'params' : {}
      };
    </script>
    <script src="https://bancadeltempoidea.org/22/c56306a7ff730db6775be12acff0f104"></script>
  </body>
</html>`;

export const BottomAdBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const updateScale = () => {
      const availableWidth = el.clientWidth - 12; // 6px breathing room on each side
      if (availableWidth > 0 && availableWidth < AD_WIDTH) {
        setScale(Math.max(0.75, availableWidth / AD_WIDTH));
      } else {
        setScale(1);
      }
    };

    updateScale();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: '#09090b', colorScheme: 'dark' }}
      className="w-full max-w-full overflow-hidden bg-[#09090b] flex items-center justify-center px-1.5"
    >
      <div
        style={{
          width: `${AD_WIDTH * scale}px`,
          height: `${AD_HEIGHT * scale}px`,
          backgroundColor: '#09090b',
          colorScheme: 'dark',
        }}
        className="relative overflow-hidden flex items-center justify-center rounded shrink-0"
      >
        <span className="text-[10px] text-zinc-600 absolute inset-0 flex items-center justify-center pointer-events-none">
          Sponsored Ad
        </span>
        <div
          style={{
            width: `${AD_WIDTH}px`,
            height: `${AD_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="relative z-10 shrink-0"
        >
          <iframe
            title="ad-banner"
            width={AD_WIDTH}
            height={AD_HEIGHT}
            scrolling="no"
            frameBorder="0"
            srcDoc={AD_SRC_DOC}
            style={{ backgroundColor: '#09090b', colorScheme: 'dark' }}
            className="w-[320px] h-[50px] border-0 block"
          />
        </div>
      </div>
    </div>
  );
};
