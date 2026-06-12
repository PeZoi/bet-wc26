'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MatchCountdownProps {
  matchTime: string;
}

export default function MatchCountdown({ matchTime }: MatchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const target = new Date(matchTime).getTime();

    const updateTimer = () => {
      const difference = target - Date.now();

      if (difference <= 0) {
        setTimeLeft('Đã bắt đầu');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let str = '';
      if (days > 0) {
        str += `${days}d `; // d đại diện cho ngày (days)
      }
      str += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setTimeLeft(str);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [matchTime]);

  return (
    <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3.5 py-1.5 rounded-full mt-3 font-mono font-extrabold uppercase tracking-wider shadow-md shadow-yellow-500/5 select-none">
      <Clock className="h-3.5 w-3.5 animate-pulse text-yellow-500 flex-shrink-0" />
      <span>{timeLeft || 'Đang tính...'}</span>
    </span>
  );
}
