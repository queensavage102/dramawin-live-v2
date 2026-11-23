import React, { useEffect, useRef } from 'react';

export const BottomAdBanner: React.FC = () => {
  const adContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = adContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `
      atOptions = {
        'key' : 'ad841ac96a8c7900f78d4c0aef6fd6f5',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.src = 'https://bancadeltempoidea.org/22/ad841ac96a8c7900f78d4c0aef6fd6f5';
    adScript.async = true;

    container.appendChild(configScript);
    container.appendChild(adScript);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="w-full h-[66px] min-h-[66px] flex flex-col items-center justify-between bg-[#09090b] shrink-0">
      <p className="w-full h-[14px] text-[10px] leading-none uppercase tracking-wider text-zinc-500 text-center py-0.5 select-none">
        ADVERTISEMENT
      </p>
      <div
        ref={adContainerRef}
        className="w-[320px] h-[50px] mx-auto flex items-center justify-center bg-[#09090b] shrink-0"
      />
    </div>
  );
};
