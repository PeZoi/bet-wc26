'use client';

import React, { useState, useEffect } from 'react';
import { Match, Prediction } from '@/types';
import { Clock, Edit3, Award, Trophy } from 'lucide-react';
import Link from 'next/link';

interface MatchCardProps {
  match: Match;
  userPrediction?: Prediction;
  onPredictClick?: (match: Match) => void;
  isLoggedIn: boolean;
}

export default function MatchCard({
  match,
  userPrediction,
  onPredictClick,
  isLoggedIn
}: MatchCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const matchTime = new Date(match.match_time).getTime();
      const now = Date.now();
      const difference = matchTime - now;

      // Lock prediction 5 mins before match starts
      setIsLocked(difference <= 5 * 60 * 1000 || match.status !== 'NS');

      if (difference <= 0) {
        setTimeLeft('');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (days > 0) {
        setTimeLeft(`${days} ngày ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} giờ ${minutes}m`);
      } else {
        setTimeLeft(`${minutes} phút`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // update every minute

    return () => clearInterval(timer);
  }, [match.match_time, match.status]);

  const formattedTime = new Date(match.match_time).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(match.match_time).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
  });

  // Calculate badge styling for points earned
  const getPointsBadge = (points: number | null) => {
    if (points === null) return null;
    if (points === 3) {
      return (
        <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-sm shadow-emerald-500/10">
          <Trophy className="h-3.5 w-3.5" />
          Chính xác (+3đ)
        </span>
      );
    }
    if (points === 1) {
      return (
        <span className="flex items-center gap-1 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full shadow-sm shadow-cyan-500/10">
          <Award className="h-3.5 w-3.5" />
          Đoán đúng kết quả (+1đ)
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold bg-white/5 text-muted-foreground border border-white/10 px-2.5 py-1 rounded-full">
        Sai tỉ số (0đ)
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between h-full relative group">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {match.stage}
        </span>
        {match.status === 'LIVE' ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-full animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            LIVE
          </span>
        ) : match.status === 'FT' ? (
          <span className="text-xs font-semibold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            Kết thúc
          </span>
        ) : timeLeft ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            <Clock className="h-3 w-3" />
            {timeLeft}
          </span>
        ) : (
          <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
            Sắp đá
          </span>
        )}
      </div>

      {/* Main Teams Match Section */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1 text-center">
          <div className="relative h-[34px] w-[50px] flex items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-300">
            {match.home_logo ? (
              <img
                src={match.home_logo}
                alt={`${match.home_team} flag`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.home_team;
                }}
              />
            ) : (
              <div className="text-sm font-bold">{match.home_team.substring(0, 3).toUpperCase()}</div>
            )}
          </div>
          <span className="mt-2 text-sm font-bold text-foreground line-clamp-1">
            {match.home_team}
          </span>
        </div>

        {/* Match Score or Time */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[70px]">
          {match.status === 'FT' || match.status === 'LIVE' ? (
            <div className="flex items-center gap-1.5 text-2xl font-mono font-extrabold tracking-tight text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              <span>{match.home_score ?? 0}</span>
              <span className="text-muted-foreground font-sans text-xl">:</span>
              <span>{match.away_score ?? 0}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold font-mono tracking-tight text-white">
                {formattedTime}
              </span>
              <span className="text-[10px] text-muted-foreground text-center mt-0.5 font-medium whitespace-nowrap">
                {formattedDate}
              </span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center flex-1 text-center">
          <div className="relative h-[34px] w-[50px] flex items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-300">
            {match.away_logo ? (
              <img
                src={match.away_logo}
                alt={`${match.away_team} flag`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.away_team;
                }}
              />
            ) : (
              <div className="text-sm font-bold">{match.away_team.substring(0, 3).toUpperCase()}</div>
            )}
          </div>
          <span className="mt-2 text-sm font-bold text-foreground line-clamp-1">
            {match.away_team}
          </span>
        </div>
      </div>

      {/* Prediction Section */}
      <div className="mt-5 border-t border-white/5 pt-4 flex flex-col gap-3">
        {/* If user predicted */}
        {userPrediction ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-white/5 py-2 px-3 rounded-lg border border-white/5">
              <span className="text-xs font-semibold text-muted-foreground">Bạn đoán:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                  {userPrediction.predicted_home_score} - {userPrediction.predicted_away_score}
                </span>
                {!isLocked && isLoggedIn && (
                  onPredictClick ? (
                    <button
                      onClick={() => onPredictClick(match)}
                      className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Sửa dự đoán"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Link
                      href="/matches"
                      className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Sửa dự đoán"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Link>
                  )
                )}
              </div>
            </div>
            {match.status === 'FT' && getPointsBadge(userPrediction.points_earned)}
          </div>
        ) : (
          /* If user didn't predict yet */
          <div className="flex flex-col">
            {isLocked ? (
              <div className="text-center text-xs text-muted-foreground bg-white/5 py-2 px-3 rounded-lg border border-white/5 italic">
                Thời gian dự đoán đã khóa
              </div>
            ) : isLoggedIn ? (
              onPredictClick ? (
                <button
                  onClick={() => onPredictClick(match)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 py-2.5 text-sm font-semibold text-primary hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Dự đoán tỉ số
                </button>
              ) : (
                <Link
                  href="/matches"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 py-2.5 text-sm font-semibold text-primary hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Dự đoán tỉ số
                </Link>
              )
            ) : (
              <div className="text-center text-xs text-muted-foreground bg-white/5 py-2 px-3 rounded-lg border border-white/5">
                Đăng nhập để tham gia dự đoán
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
