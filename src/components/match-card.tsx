'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Match, Prediction } from '@/types';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import { Clock, Edit3, Trophy, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMatchScoreAdmin } from '@/app/actions';

interface MatchCardProps {
  match: Match;
  userPrediction?: Prediction;
  onPredictClick?: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin?: boolean;
}

// Portal component to render modals directly under document.body
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}

export default function MatchCard({
  match,
  userPrediction,
  onPredictClick,
  isLoggedIn,
  isAdmin = false
}: MatchCardProps) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // States for Admin Handicap Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [tempHandicapTeam, setTempHandicapTeam] = useState<'home' | 'away' | 'none'>('none');
  const [tempHandicapValue, setTempHandicapValue] = useState<number>(0);
  const [isSavingHandicap, setIsSavingHandicap] = useState(false);

  const handleOpenAdminModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài Card
    setTempHandicapTeam((match.handicap_team as 'home' | 'away' | 'none') || 'none');
    setTempHandicapValue(match.handicap_value ?? 0);
    setIsAdminModalOpen(true);
  };

  const handleSaveHandicap = async () => {
    setIsSavingHandicap(true);
    try {
      const res = await updateMatchScoreAdmin(
        match.id,
        match.home_score ?? 0,
        match.away_score ?? 0,
        match.status,
        tempHandicapTeam,
        tempHandicapTeam === 'none' ? 0 : tempHandicapValue
      );

      if (res.success) {
        await showAlert('Cập nhật kèo chấp thành công!', { type: 'success', title: 'Thành công' });
        setIsAdminModalOpen(false);
        router.refresh();
      } else {
        await showAlert(`Lỗi: ${res.message}`, { type: 'error', title: 'Lỗi' });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
      await showAlert(`Lỗi: ${errMsg}`, { type: 'error', title: 'Lỗi' });
    } finally {
      setIsSavingHandicap(false);
    }
  };

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

  const renderPredictionChoice = () => {
    if (!userPrediction) return null;
    const choice = userPrediction.prediction_choice;

    if (choice === 'home') {
      return (
        <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg text-xs font-bold">
          <img src={match.home_logo} className="h-3 w-4.5 object-cover rounded-sm bg-white/5" alt="" />
          <TeamName name={match.home_team} />
        </span>
      );
    }
    if (choice === 'away') {
      return (
        <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg text-xs font-bold">
          <img src={match.away_logo} className="h-3 w-4.5 object-cover rounded-sm bg-white/5" alt="" />
          <TeamName name={match.away_team} />
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
        Hòa
      </span>
    );
  };

  // Calculate badge styling for points earned
  const getPointsBadge = (points: number | null) => {
    if (points === null) return null;
    if (points === 3) {
      return (
        <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-sm shadow-emerald-500/10">
          <Trophy className="h-3.5 w-3.5" />
          Dự đoán đúng (+3đ)
        </span>
      );
    }
    return (
      <span className="text-xs font-semibold bg-white/5 text-muted-foreground border border-white/10 px-2.5 py-1 rounded-full text-center">
        Dự đoán sai (0đ)
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between h-full relative group">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {match.stage}
          </span>
          {isAdmin && match.status !== 'FT' && (
            <button
              onClick={handleOpenAdminModal}
              className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Thiết lập chấp (Admin)"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
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
        <div className="flex flex-col items-center flex-1 text-center min-w-0">
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
          <TeamName 
            name={match.home_team} 
            className="mt-2 text-sm font-bold text-foreground max-w-full justify-center" 
          />
          {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
              Chấp {match.handicap_value}
            </span>
          )}
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
        <div className="flex flex-col items-center flex-1 text-center min-w-0">
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
          <TeamName 
            name={match.away_team} 
            className="mt-2 text-sm font-bold text-foreground max-w-full justify-center" 
          />
          {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
              Chấp {match.handicap_value}
            </span>
          )}
        </div>
      </div>

      {/* Prediction Section */}
      <div className="mt-5 border-t border-white/5 pt-4 flex flex-col gap-3">
        {/* If user predicted */}
        {userPrediction ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] py-2 px-3 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
              <span className="text-xs font-semibold text-muted-foreground">Bạn chọn:</span>
              <div className="flex items-center gap-2">
                {renderPredictionChoice()}
                {!isLocked && isLoggedIn && (
                  onPredictClick ? (
                    <button
                      onClick={() => onPredictClick(match)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      title="Sửa dự đoán"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Link
                      href="/matches"
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
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
                  Dự đoán kết quả
                </button>
              ) : (
                <Link
                  href="/matches"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 py-2.5 text-sm font-semibold text-primary hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Dự đoán kết quả
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

      {/* Chi tiết trận đấu Link */}
      <div className="mt-4 border-t border-white/5 pt-3 flex justify-center">
        <Link
          href={`/matches/${match.id}`}
          className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          Chi tiết trận đấu & Dự đoán khác →
        </Link>
      </div>

      {/* Handicap Configuration Dialog (Admin) */}
      <Portal>
        <AnimatePresence>
          {isAdminModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminModalOpen(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative w-full max-w-[480px] bg-[#11131a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] text-white z-10 p-7 space-y-6 text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Cấu hình kèo chấp Handicap
                  </h3>
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="text-muted-foreground/80 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Match Header Info */}
                <div className="flex items-center justify-between bg-[#161822] border border-white/[0.03] rounded-2xl p-5 gap-4">
                  {/* Home Team */}
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <img 
                      src={match.home_logo} 
                      className="h-10 w-[60px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5" 
                      alt={match.home_team} 
                    />
                    <TeamName 
                      name={match.home_team} 
                      className="mt-2 text-xs sm:text-sm font-bold text-white max-w-full justify-center" 
                    />
                  </div>

                  {/* VS badge */}
                  <div className="text-[10px] font-mono font-bold bg-[#242735] border border-white/[0.08] text-muted-foreground/80 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    vs
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <img 
                      src={match.away_logo} 
                      className="h-10 w-[60px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5" 
                      alt={match.away_team} 
                    />
                    <TeamName 
                      name={match.away_team} 
                      className="mt-2 text-xs sm:text-sm font-bold text-white max-w-full justify-center" 
                    />
                  </div>
                </div>

                {/* Handicap Team Select */}
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                    Chọn đội chấp
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'none', label: 'Không chấp' },
                      { id: 'home', label: `${translateTeamName(match.home_team)} chấp` },
                      { id: 'away', label: `${translateTeamName(match.away_team)} chấp` }
                    ].map((option) => {
                      const isSelected = tempHandicapTeam === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTempHandicapTeam(option.id as 'home' | 'away' | 'none')}
                          className={`py-3.5 px-3 text-xs sm:text-sm font-bold rounded-2xl border transition-all cursor-pointer flex items-center justify-center text-center min-h-[56px] leading-snug ${
                            isSelected
                              ? 'bg-[#0c2a20]/45 border-[#10b981]/60 text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                              : 'bg-[#181b25]/85 border-white/[0.04] text-muted-foreground/85 hover:bg-[#202432] hover:text-white'
                          }`}
                          title={option.label}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Handicap Value Input */}
                {tempHandicapTeam !== 'none' && (
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Tỷ lệ chấp (Trái)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={tempHandicapValue}
                        onChange={(e) => setTempHandicapValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-28 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-2xl py-3.5 px-4 text-white text-base focus:outline-none focus:border-[#10b981]/40 focus:ring-1 focus:ring-[#10b981]/25 transition-all shadow-inner"
                        placeholder="0.5"
                      />
                      {/* Quick Selection Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 flex-1">
                        {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((val) => {
                          const isValSelected = tempHandicapValue === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setTempHandicapValue(val)}
                              className={`py-2 px-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                                isValSelected
                                  ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                                  : 'bg-[#181b25]/80 border-white/[0.04] text-muted-foreground/80 hover:bg-[#202432] hover:text-white'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="px-6 py-2.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-white bg-[#1a1c26] hover:bg-[#222533] border border-white/[0.08] rounded-full transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveHandicap}
                    disabled={isSavingHandicap}
                    className="px-7 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#11f0a3] hover:to-[#059669] rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingHandicap ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
