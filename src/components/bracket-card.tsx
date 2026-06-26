'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Match, Prediction } from '@/types';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import { Edit3, Lock, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMatchScoreAdmin } from '@/app/actions';

interface BracketCardProps {
  match: Match | null;
  userPrediction?: Prediction;
  onPredictClick?: (match: Match) => void;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  placeholderHome?: string;
  placeholderAway?: string;
  matchIndexInfo?: string;
  id?: string;
}

// Portal component to render modals directly under document.body
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}

// Helper format số điểm ngắn gọn (VD: 30000 -> +30k) để giao diện sạch sẽ, vừa vặn
const formatScoreCompact = (val: number | null | undefined) => {
  if (val === null || val === undefined) return '0';
  if (val >= 1000) {
    const compactVal = val / 1000;
    return `+${Number(compactVal.toFixed(1))}k`;
  }
  return `+${val}đ`;
};

export default function BracketCard({
  match,
  userPrediction,
  onPredictClick,
  isLoggedIn,
  isAdmin = false,
  placeholderHome = 'Chưa xác định',
  placeholderAway = 'Chưa xác định',
  matchIndexInfo,
  id
}: BracketCardProps) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [isLocked, setIsLocked] = useState(true);

  // States for Admin Handicap Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [tempHandicapTeam, setTempHandicapTeam] = useState<'home' | 'away' | 'none'>('none');
  const [tempHandicapValue, setTempHandicapValue] = useState<number>(0);
  const [tempLossPoints, setTempLossPoints] = useState<number>(0);
  const [tempDrawPoints, setTempDrawPoints] = useState<number>(0);
  const [tempApplyScope, setTempApplyScope] = useState<'match' | 'stage' | 'group_stage'>('match');
  const [isSavingHandicap, setIsSavingHandicap] = useState(false);

  const handleOpenAdminModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài Card
    if (!match) return;
    setTempHandicapTeam((match.handicap_team as 'home' | 'away' | 'none') || 'none');
    setTempHandicapValue(match.handicap_value ?? 0);
    setTempLossPoints(match.loss_points ?? 0);
    setTempDrawPoints(match.draw_points ?? 0);
    setTempApplyScope('match');
    setIsAdminModalOpen(true);
  };

  const handleSaveHandicap = async () => {
    if (!match) return;
    setIsSavingHandicap(true);
    try {
      const res = await updateMatchScoreAdmin(
        match.id,
        match.home_score ?? 0,
        match.away_score ?? 0,
        match.status,
        tempHandicapTeam,
        tempHandicapTeam === 'none' ? 0 : tempHandicapValue,
        tempLossPoints,
        tempApplyScope,
        tempDrawPoints
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
    const timer = setTimeout(() => {
      if (match) {
        setIsLocked(new Date(match.match_time).getTime() - 5 * 60 * 1000 < Date.now());
      } else {
        setIsLocked(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [match]);



  const renderPredictionChoice = () => {
    if (!userPrediction || !match) return null;
    const choice = userPrediction.prediction_choice;

    if (choice === 'home') {
      return (
        <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold min-w-0 max-w-[110px] shadow-sm shadow-primary/5">
          <img src={match.home_logo} className="h-3 w-4.5 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" />
          <TeamName
            name={match.home_team}
            className="text-[10.5px] font-bold text-primary truncate max-w-[70px]"
            spanClassName="max-w-[70px] truncate block"
          />
        </span>
      );
    }
    if (choice === 'away') {
      return (
        <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold min-w-0 max-w-[110px] shadow-sm shadow-primary/5">
          <img src={match.away_logo} className="h-3 w-4.5 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" />
          <TeamName
            name={match.away_team}
            className="text-[10.5px] font-bold text-primary truncate max-w-[70px]"
            spanClassName="max-w-[70px] truncate block"
          />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-white px-1.5 py-0.5 rounded-lg text-[10.5px] font-bold shadow-sm">
        Hòa
      </span>
    );
  };

  const handicapTeam = match?.handicap_team || 'none';
  const handicapVal = Number(match?.handicap_value || 0);
  let isDraw = false;

  if (match && match.status === 'FT' && match.home_score !== null && match.away_score !== null) {
    if (handicapTeam === 'none' || handicapVal === 0) {
      isDraw = match.home_score === match.away_score;
    } else {
      let diff = 0;
      if (handicapTeam === 'home') {
        diff = (match.home_score - handicapVal) - match.away_score;
      } else if (handicapTeam === 'away') {
        diff = match.home_score - (match.away_score - handicapVal);
      } else {
        diff = match.home_score - match.away_score;
      }
      isDraw = diff === 0;
    }
  }

  const getPointsBadge = (points: number | null) => {
    if (points === null) return null;
    if (points === 1) {
      return (
        <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ml-0.5 shadow-sm shadow-emerald-500/5">
          +1đ
        </span>
      );
    }
    // Trận hoà: hiển thị riêng với màu sky
    if (isDraw) {
      if (points > 0) {
        return (
          <span className="bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ml-0.5 shadow-sm shadow-sky-500/5">
            +{new Intl.NumberFormat('en-US').format(points)}đ
          </span>
        );
      }
      return (
        <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400/90 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ml-0.5">
          0đ
        </span>
      );
    }
    // Đoán sai: nếu có điểm thua > 0 thì hiện màu amber, ngược lại hiện màu xám
    if (points > 0) {
      return (
        <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ml-0.5 shadow-sm shadow-amber-500/5">
          +{new Intl.NumberFormat('en-US').format(points)}đ
        </span>
      );
    }
    return (
      <span className="bg-white/5 border border-white/10 text-muted-foreground text-[9.5px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ml-0.5">
        0đ
      </span>
    );
  };

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
      id={id}
      onClick={handleCardClick}
      className={`w-[260px] h-[120px] bg-[#131622]/60 backdrop-blur-md border rounded-xl p-3.5 transition-all duration-300 text-left flex flex-col justify-between select-none relative group ${
        match && !isLocked && isLoggedIn && onPredictClick
          ? 'border-white/[0.06] hover:bg-[#181d2e]/85 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer active:scale-[0.98]'
          : 'border-white/[0.04]'
      }`}
    >
      {/* Mini info overlay */}
      <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 border-b border-white/5 pb-1">
        <span>{matchIndexInfo || (match ? match.stage : 'Knockout')}</span>
        {match && (
          <span className={match.status === 'LIVE' ? 'text-red-500 animate-pulse font-bold' : ''}>
            {match.status === 'NS' ? (
              <span className="font-mono text-emerald-400 font-bold whitespace-nowrap">
                {new Date(match.match_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })}{' '}
                {new Date(match.match_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}
              </span>
            ) : match.status === 'LIVE' ? (
              'Đang đá'
            ) : (
              'FT'
            )}
          </span>
        )}
      </div>

      <div className="space-y-1.5 flex-1 flex flex-col justify-center">
        {/* Home Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {match ? (
              <>
                <img
                  src={match.home_logo}
                  alt=""
                  className={`h-4 w-[22px] object-cover rounded-sm bg-white/5 ${
                    isFinished && !homeWinner ? 'opacity-40' : ''
                  }`}
                />
                <TeamName 
                  name={match.home_team} 
                  className={`text-[13px] text-white truncate ${
                    isFinished ? (homeWinner ? 'font-bold text-white' : 'text-white/40') : 'font-medium'
                  }`}
                />
              </>
            ) : (
              <span className="text-[13px] text-muted-foreground/60 italic truncate">{placeholderHome}</span>
            )}
          </div>
          {match && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
                <span className="inline-flex items-center justify-center text-[9px] font-black bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md select-none tracking-tight leading-none">
                  Chấp -{match.handicap_value}
                </span>
              )}
              {homeScore !== null && (
                <span
                  className={`font-mono text-sm min-w-[12px] text-right ${
                    isFinished ? (homeWinner ? 'font-bold text-primary' : 'text-white/40') : 'text-white'
                  }`}
                >
                  {homeScore}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Away Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {match ? (
              <>
                <img
                  src={match.away_logo}
                  alt=""
                  className={`h-4 w-[22px] object-cover rounded-sm bg-white/5 ${
                    isFinished && !awayWinner ? 'opacity-40' : ''
                  }`}
                />
                <TeamName 
                  name={match.away_team} 
                  className={`text-[13px] text-white truncate ${
                    isFinished ? (awayWinner ? 'font-bold text-white' : 'text-white/40') : 'font-medium'
                  }`}
                />
              </>
            ) : (
              <span className="text-[13px] text-muted-foreground/60 italic truncate">{placeholderAway}</span>
            )}
          </div>
          {match && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
                <span className="inline-flex items-center justify-center text-[9px] font-black bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md select-none tracking-tight leading-none">
                  Chấp -{match.handicap_value}
                </span>
              )}
              {awayScore !== null && (
                <span
                  className={`font-mono text-sm min-w-[12px] text-right ${
                    isFinished ? (awayWinner ? 'font-bold text-primary' : 'text-white/40') : 'text-white'
                  }`}
                >
                  {awayScore}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prediction indicator / button */}
      {match && (
        <div className="mt-1.5 pt-1.5 border-t border-white/[0.03] flex items-center justify-between min-h-[18px] gap-2">
          <div className="flex items-center justify-between w-full min-w-0">
            {userPrediction ? (
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center gap-1 text-[10.5px] font-bold truncate">
                  <span className="text-muted-foreground flex-shrink-0">Chọn:</span>
                  {renderPredictionChoice()}
                  {getPointsBadge(userPrediction.points_earned)}
                </div>
                {/* Hiển thị điểm cộng khi chưa đá */}
                {!isFinished && (Number(match.loss_points || 0) > 0 || Number(match.draw_points || 0) > 0) && (
                  <div className="text-[9px] text-muted-foreground/60 font-semibold flex items-center gap-1 select-none flex-shrink-0 ml-2">
                    {Number(match.loss_points || 0) > 0 && <span>S:{formatScoreCompact(match.loss_points)}</span>}
                    {Number(match.loss_points || 0) > 0 && Number(match.draw_points || 0) > 0 && <span>|</span>}
                    {Number(match.draw_points || 0) > 0 && <span>H:{formatScoreCompact(match.draw_points)}</span>}
                  </div>
                )}
              </div>
            ) : isLocked ? (
              <span className="flex items-center gap-1 italic text-muted-foreground/50 text-[10.5px] flex-shrink-0">
                <Lock className="h-2.5 w-2.5" /> Khóa
              </span>
            ) : (
              // Chưa dự đoán & chưa khóa: Hiển thị các tag điểm cộng tinh giản
              <div className="flex items-center justify-between w-full">
                {(Number(match.loss_points || 0) > 0 || Number(match.draw_points || 0) > 0) ? (
                  <div className="flex items-center gap-1.5 select-none">
                    {Number(match.loss_points || 0) > 0 && (
                      <span className="text-[9.5px] font-extrabold text-amber-400/90 bg-amber-500/5 border border-amber-500/10 px-1.5 py-0.5 rounded-md shadow-sm">
                        Sai {formatScoreCompact(match.loss_points)}
                      </span>
                    )}
                    {Number(match.draw_points || 0) > 0 && (
                      <span className="text-[9.5px] font-extrabold text-sky-400/90 bg-sky-500/5 border border-sky-500/10 px-1.5 py-0.5 rounded-md shadow-sm">
                        Hoà {formatScoreCompact(match.draw_points)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10.5px] text-primary/50 font-semibold group-hover:text-primary transition-colors">Nhấp để dự đoán</span>
                )}
              </div>
            )}
          </div>

          {/* Admin edit button */}
          {isAdmin && (
            <button
              onClick={handleOpenAdminModal}
              className="p-1 rounded bg-white/5 border border-white/10 text-muted-foreground/80 hover:bg-white/10 hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="Thiết lập chấp & Điểm cộng (Admin)"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Handicap Configuration Dialog (Admin) */}
      <Portal>
        <AnimatePresence>
          {isAdminModalOpen && match && (
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
                className="relative w-full max-w-[480px] max-h-[85vh] flex flex-col bg-[#11131a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] text-white z-10 p-7 text-left"
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

                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                            className={`py-3.5 px-3 text-xs sm:text-sm font-bold rounded-2xl border transition-all cursor-pointer flex items-center justify-center text-center min-h-[56px] leading-snug ${isSelected
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
                                className={`py-2 px-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${isValSelected
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

                  {/* Loss Points Input */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Điểm cộng khi dự đoán sai
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tempLossPoints === 0 ? '' : new Intl.NumberFormat('en-US').format(tempLossPoints)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          if (rawValue === '' || /^\d+$/.test(rawValue)) {
                            const numValue = parseInt(rawValue, 10);
                            setTempLossPoints(isNaN(numValue) ? 0 : numValue);
                          }
                        }}
                        className="w-28 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-2xl py-3.5 px-4 text-white text-base focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/25 transition-all shadow-inner"
                        placeholder="0"
                      />
                      {/* Quick Selection Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 flex-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((val) => {
                          const isValSelected = tempLossPoints === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setTempLossPoints(val)}
                              className={`py-2 px-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${isValSelected
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                  : 'bg-[#181b25]/80 border-white/[0.04] text-muted-foreground/80 hover:bg-[#202432] hover:text-white'
                                }`}
                            >
                              {val}đ
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Draw Points Input */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Điểm cộng khi trận đấu hoà
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tempDrawPoints === 0 ? '' : new Intl.NumberFormat('en-US').format(tempDrawPoints)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          if (rawValue === '' || /^\d+$/.test(rawValue)) {
                            const numValue = parseInt(rawValue, 10);
                            setTempDrawPoints(isNaN(numValue) ? 0 : numValue);
                          }
                        }}
                        className="w-28 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-2xl py-3.5 px-4 text-white text-base focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/25 transition-all shadow-inner"
                        placeholder="0"
                      />
                      {/* Quick Selection Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 flex-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((val) => {
                          const isValSelected = tempDrawPoints === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setTempDrawPoints(val)}
                              className={`py-2 px-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${isValSelected
                                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                                  : 'bg-[#181b25]/80 border-white/[0.04] text-muted-foreground/80 hover:bg-[#202432] hover:text-white'
                                }`}
                            >
                              {val}đ
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Phạm vi áp dụng điểm chung */}
                  <div className="space-y-2.5 mt-3.5 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Phạm vi áp dụng (Điểm sai & Điểm hoà)
                    </span>
                    <div className="flex flex-col gap-2.5 mt-2">
                      {/* Chỉ trận này */}
                      <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                        <input
                          type="radio"
                          name={`applyScope-${match.id}`}
                          value="match"
                          checked={tempApplyScope === 'match'}
                          onChange={() => setTempApplyScope('match')}
                          className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                        />
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors">
                          Chỉ áp dụng cho trận đấu này
                        </span>
                      </label>

                      {/* Cùng Stage */}
                      <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                        <input
                          type="radio"
                          name={`applyScope-${match.id}`}
                          value="stage"
                          checked={tempApplyScope === 'stage'}
                          onChange={() => setTempApplyScope('stage')}
                          className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                        />
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors">
                          Áp dụng cho toàn bộ vòng đấu ({match.stage})
                        </span>
                      </label>

                      {/* Vòng bảng */}
                      {(match.stage.toLowerCase().includes('bảng') || match.stage.toLowerCase().includes('group')) && (
                        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                          <input
                            type="radio"
                            name={`applyScope-${match.id}`}
                            value="group_stage"
                            checked={tempApplyScope === 'group_stage'}
                            onChange={() => setTempApplyScope('group_stage')}
                            className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors">
                            Áp dụng cho toàn bộ Vòng bảng
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    className="py-2.5 px-5 rounded-xl border border-white/10 hover:bg-white/5 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHandicap}
                    disabled={isSavingHandicap}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingHandicap ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu cấu hình'
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
