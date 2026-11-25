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
        className={`${className} transform-gpu`}
      />
    );
  }
);

IsolatedYouTubeIframe.displayName = 'IsolatedYouTubeIframe';

export interface IsolatedHtml5VideoProps {
  videoKey: string;
  src: string;
  className: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onCanPlay?: () => void;
  onPlaying?: () => void;
  onPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onSeeking?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onSeeked?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onWaiting?: () => void;
  onStalled?: () => void;
  onError?: () => void;
  onPause?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onEnded?: () => void;
}

export const IsolatedHtml5Video = React.memo<IsolatedHtml5VideoProps>(
  ({
    videoKey,
    src,
    className,
    autoPlay = true,
    loop = false,
    muted = false,
    controls = true,
    videoRef,
    onLoadedMetadata,
    onCanPlay,
    onPlaying,
    onPlay,
    onTimeUpdate,
    onSeeking,
    onSeeked,
    onWaiting,
    onStalled,
    onError,
    onPause,
    onEnded,
  }) => {
    return (
      <video
        ref={videoRef}
        key={videoKey}
        src={src}
        controls={controls}
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onPlaying={onPlaying}
        onPlay={onPlay}
        onTimeUpdate={onTimeUpdate}
        onSeeking={onSeeking}
        onSeeked={onSeeked}
        onWaiting={onWaiting}
        onStalled={onStalled}
        onError={onError}
        onPause={onPause}
        onEnded={onEnded}
        className={`${className} transform-gpu`}
      />
    );
  }
);

IsolatedHtml5Video.displayName = 'IsolatedHtml5Video';
