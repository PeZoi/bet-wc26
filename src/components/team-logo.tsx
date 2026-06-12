'use client';

import React, { useState, useEffect } from 'react';

interface TeamLogoProps {
  src?: string | null;
  alt: string;
  className?: string;
  teamName: string;
}

export default function TeamLogo({ 
  src, 
  alt, 
  className = "h-full w-full object-cover", 
  teamName 
}: TeamLogoProps) {
  const [imgSrc, setImgSrc] = useState<string | null | undefined>(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teamName)}`;

  const handleOnError = () => {
    setHasError(true);
  };

  if (!imgSrc || hasError) {
    return (
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleOnError}
    />
  );
}
