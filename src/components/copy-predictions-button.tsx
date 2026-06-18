'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyPredictionsButtonProps {
  text: string;
}

export default function CopyPredictionsButton({ text }: CopyPredictionsButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none active:scale-95 ${
        copied
          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
          : 'bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary hover:border-primary/40'
      }`}
      title="Copy danh sách đội đã chọn"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          <span>Đã copy cược</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy cược</span>
        </>
      )}
    </button>
  );
}
