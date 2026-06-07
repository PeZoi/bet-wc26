'use client';

import React, { useState } from 'react';
import { Match, Prediction } from '@/types';
import { submitPrediction } from '@/app/actions';
import { X, ChevronUp, ChevronDown, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PredictionModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  userPrediction?: Prediction;
  onSuccess: () => void;
}

export default function PredictionModal({
  match,
  isOpen,
  onClose,
  userPrediction,
  onSuccess
}: PredictionModalProps) {
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Sync state with props during render phase to avoid useEffect cascading renders
  const [prevMatchId, setPrevMatchId] = useState<number | null>(null);
  const currentMatchId = match?.id ?? null;
  
  if (currentMatchId !== prevMatchId) {
    setPrevMatchId(currentMatchId);
    setHomeScore(userPrediction?.predicted_home_score ?? 0);
    setAwayScore(userPrediction?.predicted_away_score ?? 0);
    setErrorMsg('');
    setSuccessMsg('');
  }

  if (!match) return null;

  const handleIncrement = (team: 'home' | 'away') => {
    if (team === 'home') setHomeScore(prev => prev + 1);
    else setAwayScore(prev => prev + 1);
  };

  const handleDecrement = (team: 'home' | 'away') => {
    if (team === 'home') setHomeScore(prev => Math.max(0, prev - 1));
    else setAwayScore(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await submitPrediction(match.id, homeScore, awayScore);
      if (res.success) {
        setSuccessMsg(res.message || 'Lưu thành công!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Có lỗi xảy ra.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể gửi dự đoán.';
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-md glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <h3 className="text-lg font-bold text-white">Dự đoán tỉ số</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Match info header */}
            <div className="text-center mb-6">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {match.stage}
              </span>
            </div>

            {/* Prediction Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between gap-4 py-2">
                {/* Home Team Input */}
                <div className="flex flex-col items-center flex-1">
                  <img
                    src={match.home_logo}
                    alt={`${match.home_team} flag`}
                    className="h-10 w-14 object-cover rounded shadow bg-white/5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.home_team;
                    }}
                  />
                  <span className="mt-2 text-sm font-bold text-foreground text-center line-clamp-1">
                    {match.home_team}
                  </span>

                  {/* Increment/Decrement Controls */}
                  <div className="flex items-center mt-4 bg-white/5 border border-white/5 rounded-xl overflow-hidden p-1">
                    <button
                      type="button"
                      onClick={() => handleDecrement('home')}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg active:scale-95 transition-all"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                    <span className="px-4 font-mono text-xl font-bold text-white min-w-[32px] text-center">
                      {homeScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrement('home')}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg active:scale-95 transition-all"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <div className="text-2xl font-mono text-muted-foreground font-extrabold pb-8">:</div>

                {/* Away Team Input */}
                <div className="flex flex-col items-center flex-1">
                  <img
                    src={match.away_logo}
                    alt={`${match.away_team} flag`}
                    className="h-10 w-14 object-cover rounded shadow bg-white/5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.away_team;
                    }}
                  />
                  <span className="mt-2 text-sm font-bold text-foreground text-center line-clamp-1">
                    {match.away_team}
                  </span>

                  {/* Increment/Decrement Controls */}
                  <div className="flex items-center mt-4 bg-white/5 border border-white/5 rounded-xl overflow-hidden p-1">
                    <button
                      type="button"
                      onClick={() => handleDecrement('away')}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg active:scale-95 transition-all"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                    <span className="px-4 font-mono text-xl font-bold text-white min-w-[32px] text-center">
                      {awayScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleIncrement('away')}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg active:scale-95 transition-all"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status messages */}
              {errorMsg && (
                <div className="text-center text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-lg">
                  <Check className="h-4 w-4" />
                  {successMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-white/5 border border-white/5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 py-3 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!successMsg}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/95 py-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Lưu dự đoán'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
