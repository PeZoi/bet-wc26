'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[60vh] py-20 px-4 animate-fade-in select-none">
      <div className="relative flex items-center justify-center">
        {/* Glow effect behind spinner */}
        <div className="absolute h-16 w-16 rounded-full bg-primary/20 blur-xl animate-pulse" />
        
        {/* Modern Spinner */}
        <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
      </div>
      
      <p className="mt-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase animate-pulse">
        Đang tải dữ liệu...
      </p>
    </div>
  );
}
