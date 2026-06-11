'use client';

import React from 'react';
import { translateTeamName } from '@/lib/translator';

interface TeamNameProps {
  name: string;
  className?: string;
  spanClassName?: string;
}

export default function TeamName({ name, className = '', spanClassName = '' }: TeamNameProps) {
  if (!name) return null;
  const translated = translateTeamName(name);
  const hasTranslation = translated.toLowerCase() !== name.toLowerCase();

  // If there's no difference after translation (e.g. Canada -> Canada), just display text normally
  if (!hasTranslation) {
    return <span className={`truncate ${className}`}>{name}</span>;
  }

  return (
    <span className={`relative inline-flex max-w-full items-center min-w-0 ${className}`}>
      <span className={`peer cursor-help border-b border-dashed border-white/20 hover:border-primary/50 transition-colors truncate ${spanClassName}`}>
        {translated}
      </span>
      
      {/* Premium Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[10px] font-mono font-bold text-white bg-[#151720]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-0 scale-95 translate-y-1 peer-hover:opacity-100 peer-hover:scale-100 peer-hover:translate-y-0 transition-all duration-150 pointer-events-none z-[100] whitespace-nowrap">
        {name}
        {/* Tooltip arrow */}
        <span className="absolute top-[100%] left-1/2 -translate-x-1/2 -mt-[4px] w-1.5 h-1.5 rotate-45 bg-[#151720] border-r border-b border-white/10" />
      </span>
    </span>
  );
}
