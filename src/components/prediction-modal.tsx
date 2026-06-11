'use client';

import React, { useState } from 'react';
import { Match, Prediction } from '@/types';
import { submitPrediction } from '@/app/actions';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
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
  const [predictionChoice, setPredictionChoice] = useState<'home' | 'away' | 'draw' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Sync state with props during render phase to avoid useEffect cascading renders
  const [prevMatchId, setPrevMatchId] = useState<number | null>(null);
  const currentMatchId = match?.id ?? null;
  
  if (currentMatchId !== prevMatchId) {
    setPrevMatchId(currentMatchId);
    setPredictionChoice(userPrediction?.prediction_choice ?? null);
    setErrorMsg('');
    setSuccessMsg('');
  }

  if (!match) return null;

  const getHandicapText = (team: 'home' | 'away') => {
    const hTeam = match.handicap_team || 'none';
    const hVal = Number(match.handicap_value || 0);
    if (hTeam === 'none' || hVal === 0) return '';
    if (hTeam === team) {
      return `(Chấp ${hVal})`;
    } else {
      return `(Được chấp ${hVal})`;
    }
  };

  const isHandicapMatch = (match.handicap_team && match.handicap_team !== 'none' && Number(match.handicap_value || 0) > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predictionChoice) {
      setErrorMsg('Vui lòng chọn kết quả để dự đoán.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await submitPrediction(match.id, predictionChoice);
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
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <h3 className="text-lg font-bold text-white">Dự đoán kết quả</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Match info header */}
            <div className="text-center mb-5 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                {match.stage}
              </span>
              {isHandicapMatch ? (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full mt-1.5 uppercase tracking-wider">
                  Kèo: {match.handicap_team === 'home' ? translateTeamName(match.home_team) : translateTeamName(match.away_team)} chấp {match.handicap_value} trái
                </span>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/5 px-2.5 py-1 rounded-full mt-1.5 uppercase tracking-wider">
                  Dự đoán đội giành chiến thắng
                </span>
              )}
            </div>

            {/* Prediction Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-4">
                {/* 2 Choices Mode (Home or Away only - No Draw) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Home Button */}
                  <button
                    type="button"
                    onClick={() => setPredictionChoice('home')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      predictionChoice === 'home'
                        ? 'bg-primary/15 border-primary text-primary shadow-sm shadow-primary/10'
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <img
                      src={match.home_logo}
                      alt=""
                      className="h-8 w-12 object-cover rounded shadow-md mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.home_team;
                      }}
                    />
                    <TeamName name={match.home_team} className="font-bold text-sm max-w-full justify-center" />
                  </button>

                  {/* Away Button */}
                  <button
                    type="button"
                    onClick={() => setPredictionChoice('away')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      predictionChoice === 'away'
                        ? 'bg-primary/15 border-primary text-primary shadow-sm shadow-primary/10'
                        : 'bg-white/5 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <img
                      src={match.away_logo}
                      alt=""
                      className="h-8 w-12 object-cover rounded shadow-md mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + match.away_team;
                      }}
                    />
                    <TeamName name={match.away_team} className="font-bold text-sm max-w-full justify-center" />
                  </button>
                </div>
              </div>

              {/* Status messages */}
              {errorMsg && (
                <div className="text-center text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg animate-shake">
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
