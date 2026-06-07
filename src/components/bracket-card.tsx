'use client';

import React, { useState, useEffect } from 'react';
import { Match, Prediction } from '@/types';
import { Edit3, Lock, Trophy } from 'lucide-react';

interface BracketCardProps {
  match: Match | null;
  userPrediction?: Prediction;
  onPredictClick?: (match: Match) => void;
  isLoggedIn: boolean;
  placeholderHome?: string;
  placeholderAway?: string;
  matchIndexInfo?: string;
}

export default function BracketCard({
  match,
  userPrediction,
  onPredictClick,
  isLoggedIn,
  placeholderHome = 'Chưa xác định',
  placeholderAway = 'Chưa xác định',
  matchIndexInfo
}: BracketCardProps) {
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (match) {
        setIsLocked(new Date(match.match_time).getTime() - 5 * 60 * 1000 < Date.now());
      } else {
        setIsLocked(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [match]);

  const isFinished = match?.status === 'FT';

  // Determine winner for highlights
  const homeScore = match?.home_score ?? null;
  const awayScore = match?.away_score ?? null;
  const hasResult = homeScore !== null && awayScore !== null;
  const homeWinner = hasResult && homeScore > awayScore;
  const awayWinner = hasResult && awayScore > homeScore;

  const handleCardClick = () => {
    if (match && !isLocked && isLoggedIn && onPredictClick) {
      onPredictClick(match);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`w-60 h-20 bg-white/[0.02] border rounded-xl p-2.5 transition-all text-left flex flex-col justify-between select-none relative group ${
        match && !isLocked && isLoggedIn && onPredictClick
          ? 'hover:bg-white/[0.05] hover:border-primary/40 cursor-pointer hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]'
          : 'border-white/5'
      }`}
    >
      {/* Mini info overlay */}
      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 border-b border-white/5 pb-1">
        <span>{matchIndexInfo || (match ? match.stage : 'Knockout')}</span>
        {match && (
          <span className={match.status === 'LIVE' ? 'text-red-500 animate-pulse font-bold' : ''}>
            {match.status === 'NS' ? 'Chưa đá' : match.status === 'LIVE' ? 'Đang đá' : 'FT'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Home Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {match ? (
              <>
                <img
                  src={match.home_logo}
                  alt=""
                  className={`h-3.5 w-5 object-cover rounded-sm bg-white/5 ${
                    isFinished && !homeWinner ? 'opacity-40' : ''
                  }`}
                />
                <span
                  className={`text-xs truncate text-white ${
                    isFinished ? (homeWinner ? 'font-bold text-white' : 'text-white/40') : 'font-medium'
                  }`}
                >
                  {match.home_team}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60 italic truncate">{placeholderHome}</span>
            )}
          </div>
          {match && homeScore !== null && (
            <span
              className={`font-mono text-xs ${
                isFinished ? (homeWinner ? 'font-bold text-primary' : 'text-white/40') : 'text-white'
              }`}
            >
              {homeScore}
            </span>
          )}
        </div>

        {/* Away Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {match ? (
              <>
                <img
                  src={match.away_logo}
                  alt=""
                  className={`h-3.5 w-5 object-cover rounded-sm bg-white/5 ${
                    isFinished && !awayWinner ? 'opacity-40' : ''
                  }`}
                />
                <span
                  className={`text-xs truncate text-white ${
                    isFinished ? (awayWinner ? 'font-bold text-white' : 'text-white/40') : 'font-medium'
                  }`}
                >
                  {match.away_team}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60 italic truncate">{placeholderAway}</span>
            )}
          </div>
          {match && awayScore !== null && (
            <span
              className={`font-mono text-xs ${
                isFinished ? (awayWinner ? 'font-bold text-primary' : 'text-white/40') : 'text-white'
              }`}
            >
              {awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Prediction indicator / button */}
      {match && (
        <div className="mt-2 pt-1 border-t border-white/[0.03] flex items-center justify-between">
          {userPrediction ? (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <Trophy className="h-3 w-3" />
              <span>Dự đoán: {userPrediction.predicted_home_score} - {userPrediction.predicted_away_score}</span>
              {userPrediction.points_earned !== null && (
                <span className="text-yellow-500 font-extrabold ml-1">+{userPrediction.points_earned}đ</span>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground">
              {isLocked ? (
                <span className="flex items-center gap-1 italic text-muted-foreground/50">
                  <Lock className="h-2.5 w-2.5" /> Khóa
                </span>
              ) : isLoggedIn ? (
                <span className="flex items-center gap-1 text-primary group-hover:underline">
                  <Edit3 className="h-2.5 w-2.5" /> Nhấp để dự đoán
                </span>
              ) : (
                <span className="text-muted-foreground/40 italic">Chưa dự đoán</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
