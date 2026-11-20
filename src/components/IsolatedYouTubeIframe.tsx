import React from 'react';

interface IsolatedYouTubeIframeProps {
  iframeKey: string;
  src: string;
  title: string;
  className: string;
  allow: string;
  allowFullScreen?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onLoad?: () => void;
}

export const IsolatedYouTubeIframe = React.memo<IsolatedYouTubeIframeProps>(
  ({
    iframeKey,
    src,
    title,
    className,
    allow,
    allowFullScreen = false,
    referrerPolicy = 'strict-origin-when-cross-origin',
    iframeRef,
    onLoad,
  }) => {
    return (
      <iframe
        ref={iframeRef}
        key={iframeKey}
        src={src}
        title={title}
        onLoad={onLoad}
        referrerPolicy={referrerPolicy}
        allow={allow}
        allowFullScreen={allowFullScreen}
        className={className}
      />
    );
  }
);

IsolatedYouTubeIframe.displayName = 'IsolatedYouTubeIframe';
