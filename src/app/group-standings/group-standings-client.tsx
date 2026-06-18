'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Match, Prediction } from '@/types';
import TeamName from '@/components/team-name';
import { translateTeamName } from '@/lib/translator';
import { Globe, ChevronDown, ChevronUp, Calendar, Edit3, X, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMatchScoreAdmin } from '@/app/actions';
import PredictionModal from '@/components/prediction-modal';

interface TeamStanding {
  teamName: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface GroupStanding {
  groupLetter: string;
  teams: TeamStanding[];
}

interface GroupStandingsClientProps {
  initialGroups: GroupStanding[];
  allMatches: Match[];
  predictions: Prediction[];
  isLoggedIn: boolean;
  isAdmin?: boolean;
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

// Hàm helper để định dạng điểm số với dấu phẩy phân cách hàng ngàn
const formatPointsDisplay = (pts: number, showPlus = false) => {
  if (pts === 0) return '0đ';
  const prefix = showPlus && pts > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('en-US').format(pts);
  return `${prefix}${formatted}đ`;
};

export default function GroupStandingsClient({
  initialGroups,
  allMatches,
  predictions,
  isLoggedIn,
  isAdmin = false
}: GroupStandingsClientProps) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Prediction Modal States
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isPredictModalOpen, setIsPredictModalOpen] = useState(false);

  // Admin Handicap Modal States
  const [selectedAdminMatch, setSelectedAdminMatch] = useState<Match | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [tempHandicapTeam, setTempHandicapTeam] = useState<'home' | 'away' | 'none'>('none');
  const [tempHandicapValue, setTempHandicapValue] = useState<number>(0);
  const [tempLossPoints, setTempLossPoints] = useState<number>(0);
  const [tempDrawPoints, setTempDrawPoints] = useState<number>(0);
  const [tempApplyScope, setTempApplyScope] = useState<'match' | 'stage' | 'group_stage'>('match');
  const [isSavingHandicap, setIsSavingHandicap] = useState(false);

  const toggleGroup = (groupLetter: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLetter]: !prev[groupLetter]
    }));
  };

  const getGroupMatches = (groupLetter: string) => {
    return allMatches
      .filter((m) => {
        const stage = m.stage.toLowerCase();
        return stage === `bảng ${groupLetter.toLowerCase()}` || stage === `group ${groupLetter.toLowerCase()}`;
      })
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());
  };

  const handlePredictClick = (match: Match) => {
    setSelectedMatch(match);
    setIsPredictModalOpen(true);
  };

  const handlePredictionSuccess = () => {
    router.refresh();
  };

  const handleOpenAdminModal = (match: Match) => {
    setSelectedAdminMatch(match);
    setTempHandicapTeam((match.handicap_team as 'home' | 'away' | 'none') || 'none');
    setTempHandicapValue(match.handicap_value ?? 0);
    setTempLossPoints(match.loss_points ?? 0);
    setTempDrawPoints(match.draw_points ?? 0);
    setTempApplyScope('match');
    setIsAdminModalOpen(true);
  };

  const handleSaveHandicap = async () => {
    if (!selectedAdminMatch) return;
    setIsSavingHandicap(true);
    try {
      const res = await updateMatchScoreAdmin(
        selectedAdminMatch.id,
        selectedAdminMatch.home_score ?? 0,
        selectedAdminMatch.away_score ?? 0,
        selectedAdminMatch.status,
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialGroups.map((group) => {
        const isExpanded = !!expandedGroups[group.groupLetter];
        const groupMatches = getGroupMatches(group.groupLetter);
        const playedMatchesCount = groupMatches.filter((m) => m.status === 'FT').length;

        return (
          <div
            key={group.groupLetter}
            className="glass-panel overflow-hidden rounded-2xl border border-white/5 bg-card/25 shadow-lg flex flex-col h-fit transition-all duration-300"
          >
            {/* Group header - click to toggle collapse */}
            <button
              onClick={() => toggleGroup(group.groupLetter)}
              className="w-full bg-gradient-to-r from-primary/10 to-transparent px-4 py-3.5 border-b border-white/5 flex items-center justify-between hover:from-primary/15 transition-all text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-wide">
                  BẢNG {group.groupLetter}
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-bold uppercase bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
                  {playedMatchesCount}/{groupMatches.length} trận
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground/80 font-bold uppercase hidden sm:inline">
                  {isExpanded ? 'Thu gọn' : 'Xem trận đấu'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-muted-foreground/60 font-semibold bg-white/[0.002]">
                    <th className="py-2.5 px-3 text-center w-8">#</th>
                    <th className="py-2.5 px-2">Đội</th>
                    <th className="py-2.5 px-2 text-center w-10" title="Trận đã đấu">Tr</th>
                    <th className="py-2.5 px-2 text-center w-16" title="Thắng - Hòa - Thua">T-H-B</th>
                    <th className="py-2.5 px-2 text-center w-12" title="Hiệu số bàn thắng">HS</th>
                    <th className="py-2.5 px-3 text-center w-10 font-bold text-foreground">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((team, idx) => {
                    const rank = idx + 1;

                    // Determine rank color class
                    let rankCircleClass = 'bg-white/5 text-muted-foreground';
                    let rowBorderClass = 'border-l-2 border-transparent';
                    let textClass = 'text-muted-foreground/80';

                    if (rank <= 2) {
                      rankCircleClass = 'bg-emerald-500/10 text-emerald-400 font-bold';
                      rowBorderClass = 'border-l-2 border-emerald-500';
                      textClass = 'text-white font-medium';
                    } else if (rank === 3) {
                      rankCircleClass = 'bg-blue-500/10 text-blue-400 font-bold';
                      rowBorderClass = 'border-l-2 border-blue-500';
                      textClass = 'text-white/90';
                    } else {
                      rankCircleClass = 'bg-red-500/5 text-red-500/50';
                      rowBorderClass = 'border-l-2 border-red-500/20';
                      textClass = 'text-muted-foreground/45';
                    }

                    return (
                      <tr
                        key={team.teamName}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${rowBorderClass}`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${rankCircleClass}`}>
                            {rank}
                          </span>
                        </td>

                        {/* Team Name + Flag */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-3.5 flex-shrink-0 overflow-hidden rounded shadow-sm border border-white/10 bg-white/5">
                              {team.logo ? (
                                <img
                                  src={team.logo}
                                  alt={team.teamName}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Globe className="w-3.5 h-3.5 text-muted-foreground/50" />
                              )}
                            </div>
                            <TeamName
                              name={team.teamName}
                              className={`text-xs max-w-[90px] sm:max-w-[120px] ${textClass}`}
                            />
                          </div>
                        </td>

                        {/* Played */}
                        <td className="py-3 px-2 text-center text-muted-foreground/90 font-medium">
                          {team.played}
                        </td>

                        {/* Won-Drawn-Lost */}
                        <td className="py-3 px-2 text-center text-muted-foreground/60 font-mono">
                          {team.won}-{team.drawn}-{team.lost}
                        </td>

                        {/* GD */}
                        <td className={`py-3 px-2 text-center font-semibold font-mono ${team.gd > 0 ? 'text-emerald-500' : team.gd < 0 ? 'text-rose-500/70' : 'text-muted-foreground/60'
                          }`}>
                          {team.gd > 0 ? `+${team.gd}` : team.gd}
                        </td>

                        {/* Points */}
                        <td className="py-3 px-3 text-center font-bold text-white text-sm bg-white/[0.01]">
                          {team.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Toggle matches button at the bottom of the table */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.01] flex justify-center">
              <button
                onClick={() => toggleGroup(group.groupLetter)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/5 hover:border-primary/20 bg-white/[0.01] hover:bg-primary/5 text-muted-foreground/80 hover:text-primary transition-all duration-200 text-xs font-semibold cursor-pointer select-none"
              >
                {isExpanded ? (
                  <>
                    <span>Thu gọn lịch đấu</span>
                    <ChevronUp className="h-3.5 w-3.5 text-primary" />
                  </>
                ) : (
                  <>
                    <span>Xem lịch đấu & kết quả ({groupMatches.length})</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </>
                )}
              </button>
            </div>

            {/* Expanded section: Matches list */}
            {isExpanded && (
              <div className="bg-black/25 border-t border-white/5 p-4 space-y-3 animate-fade-in">
                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-white/5">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span>Trận đấu và kết quả</span>
                </div>

                {groupMatches.length === 0 ? (
                  <div className="text-center text-muted-foreground text-[10px] py-4 italic">
                    Chưa có lịch đấu bảng này.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupMatches.map((match) => {
                      const matchTime = new Date(match.match_time);
                      const formattedTime = matchTime.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Ho_Chi_Minh',
                      });
                      const formattedDate = matchTime.toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Asia/Ho_Chi_Minh',
                      });

                      const isFinished = match.status === 'FT';
                      const isLive = match.status === 'LIVE';

                      const userPrediction = predictions.find(p => p.match_id === match.id);
                      const isLocked = matchTime.getTime() - Date.now() <= 5 * 60 * 1000 || match.status !== 'NS';

                      // Xác định class động dựa trên kết quả cược của người dùng (Thắng/Thua/Hoà)
                      let cardBgClass = 'bg-[#0b101c]/45 border border-white/[0.04] hover:border-white/[0.08]';
                      
                      if (isFinished && userPrediction) {
                        const earned = userPrediction.points_earned ?? 0;
                        const isPlusOne = earned === 1;
                        
                        // Tính toán xem trận đấu có hòa kèo do chấp không
                        const handicapTeam = match.handicap_team || 'none';
                        const handicapVal = Number(match.handicap_value || 0);
                        let isMatchDraw = false;
                        if (match.home_score !== null && match.away_score !== null) {
                          if (handicapTeam === 'none' || handicapVal === 0) {
                            isMatchDraw = match.home_score === match.away_score;
                          } else {
                            let diff = 0;
                            if (handicapTeam === 'home') {
                              diff = (match.home_score - handicapVal) - match.away_score;
                            } else if (handicapTeam === 'away') {
                              diff = match.home_score - (match.away_score - handicapVal);
                            }
                            isMatchDraw = diff === 0;
                          }
                        }

                        if (isPlusOne) {
                          // Thắng kèo: nền xanh lục tối
                          cardBgClass = 'bg-[#071f18]/85 border border-emerald-500/35 hover:border-emerald-500/55 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]';
                        } else if (isMatchDraw) {
                          // Hòa kèo: nền xanh dương tối (sky)
                          cardBgClass = 'bg-[#082138]/85 border border-sky-500/40 hover:border-sky-500/60 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]';
                        } else if (earned > 0) {
                          // Thua kèo nhưng được cộng điểm: nền cam tối
                          cardBgClass = 'bg-[#1a120c]/85 border border-amber-500/35 hover:border-amber-500/55 shadow-[0_0_15px_-3px_rgba(245,158,11,0.12)]';
                        } else {
                          // Thua kèo hoàn toàn 0đ: nền đỏ tối
                          cardBgClass = 'bg-[#1f0d0d]/85 border border-red-500/35 hover:border-red-500/55 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)]';
                        }
                      } else if (!isFinished && userPrediction) {
                        // Đã cược nhưng trận đấu chưa kết thúc (hoặc đang đá): nền tím indigo tối
                        cardBgClass = 'bg-[#0e1324]/60 border border-indigo-500/35 hover:border-indigo-500/55 shadow-[0_0_15px_-3px_rgba(99,102,241,0.12)]';
                      }

                      return (
                        <div
                          key={match.id}
                          onClick={() => {
                            if (isLoggedIn && !isLocked) {
                              handlePredictClick(match);
                            }
                          }}
                          className={`flex flex-col gap-2 rounded-2xl p-3 text-[11px] transition-all duration-200 ${cardBgClass} ${isLoggedIn && !isLocked ? 'cursor-pointer hover:bg-white/[0.02] hover:border-primary/20' : ''
                            }`}
                        >
                          {/* Row 1: Thời gian thi đấu & Badges cấu hình điểm */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 border-b border-white/[0.02] pb-2 select-none">
                            <span className="font-semibold flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                              {formattedDate} - {formattedTime}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Trạng thái LIVE */}
                              {isLive && (
                                <span className="flex-shrink-0 flex items-center gap-1 text-[8px] font-extrabold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                  <span className="h-1 w-1 rounded-full bg-red-500" />
                                  LIVE
                                </span>
                              )}

                              {/* Badge cấu hình điểm khi đoán Sai */}
                              {Number(match.loss_points || 0) > 0 && (
                                <span className="text-[8px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded-md select-none">
                                  Sai: {formatPointsDisplay(match.loss_points ?? 0, true)}
                                </span>
                              )}

                              {/* Badge cấu hình điểm khi Hoà */}
                              {Number(match.draw_points || 0) > 0 && (
                                <span className="text-[8px] font-bold text-sky-400 bg-sky-500/5 border border-sky-500/20 px-1.5 py-0.5 rounded-md select-none">
                                  Hoà: {formatPointsDisplay(match.draw_points ?? 0, true)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Nội dung chính trận đấu (Hai đội & Tỷ số) */}
                          <div className="flex items-center gap-2 w-full justify-center px-1 py-1">
                            {/* Đội nhà */}
                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                              <div className="flex flex-col items-end min-w-0">
                                <TeamName
                                  name={match.home_team}
                                  className="font-bold text-white justify-end text-right text-[11px]"
                                />
                                {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[8px] font-extrabold text-rose-400 mt-0.5 select-none">
                                    Chấp {match.handicap_value}
                                  </span>
                                )}
                              </div>
                              <img
                                src={match.home_logo}
                                alt=""
                                className="h-3.5 w-5 object-cover rounded shadow-sm bg-white/5 flex-shrink-0 border border-white/[0.06]"
                              />
                            </div>

                            {/* Tỷ số hoặc VS */}
                            <div className="flex items-center justify-center flex-shrink-0 min-w-[45px] select-none">
                              {isFinished || isLive ? (
                                <span className={`font-mono font-extrabold px-1.5 py-0.5 rounded text-[11px] ${isLive ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-white/5 border border-white/5 text-white'
                                  }`}>
                                  {match.home_score ?? 0} - {match.away_score ?? 0}
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold text-muted-foreground/60 uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded-full tracking-wider">
                                  vs
                                </span>
                              )}
                            </div>

                            {/* Đội khách */}
                            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                              <img
                                src={match.away_logo}
                                alt=""
                                className="h-3.5 w-5 object-cover rounded shadow-sm bg-white/5 flex-shrink-0 border border-white/[0.06]"
                              />
                              <div className="flex flex-col items-start min-w-0">
                                <TeamName
                                  name={match.away_team}
                                  className="font-bold text-white justify-start text-left text-[11px]"
                                />
                                {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[8px] font-extrabold text-rose-400 mt-0.5 select-none">
                                    Chấp {match.handicap_value}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Row 3 (Footer): Thông tin đặt cược & điểm số của người dùng */}
                          {(userPrediction || (isLoggedIn && !isLocked) || (isAdmin && match.status !== 'FT')) && (
                            <div className="flex items-center justify-between border-t border-white/[0.03] pt-2 mt-0.5 select-none">
                              {/* Phần thông tin cược & điểm thưởng */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {userPrediction ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="flex items-center gap-1 bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] px-2 py-0.5 rounded-full text-[9px] font-bold">
                                      <img
                                        src={userPrediction.prediction_choice === 'home' ? match.home_logo : match.away_logo}
                                        className="h-3.5 w-5 object-cover rounded shadow-sm bg-white/5 border border-white/5"
                                        alt=""
                                      />
                                      <span className="text-muted-foreground/60 font-medium text-[8px]">Bạn cược:</span>
                                      <TeamName
                                        name={userPrediction.prediction_choice === 'home' ? match.home_team : match.away_team}
                                        className="text-[#10b981] font-extrabold truncate max-w-[80px]"
                                      />
                                    </span>

                                    {/* Điểm nhận được với logic màu sắc yêu cầu */}
                                    {match.status === 'FT' && (() => {
                                      const earned = userPrediction.points_earned ?? 0;
                                      const isLossBonus = earned === match.loss_points && Number(match.loss_points) > 0;
                                      const isDrawBonus = earned === match.draw_points && Number(match.draw_points) > 0;
                                      const isPlusOne = earned === 1;

                                      let badgeStyle = 'bg-white/5 border border-white/10 text-muted-foreground/60';
                                      if (isPlusOne) {
                                        // Thắng +1đ giữ nguyên màu xanh
                                        badgeStyle = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
                                      } else if (isLossBonus) {
                                        // Điểm nhận được bằng điểm Sai -> đổi sang màu cam
                                        badgeStyle = 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
                                      } else if (isDrawBonus) {
                                        // Điểm nhận được bằng điểm Hoà -> đổi sang màu xanh dương
                                        badgeStyle = 'bg-sky-500/10 border border-sky-500/20 text-sky-400';
                                      } else if (earned > 0) {
                                        badgeStyle = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
                                      }

                                      return (
                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold ${badgeStyle}`}>
                                          {formatPointsDisplay(earned, true)}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground/40 italic">Chưa đặt cược</span>
                                )}
                              </div>

                              {/* Các nút hành động */}
                              <div className="flex items-center gap-1.5">
                                {isLoggedIn && !isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePredictClick(match);
                                    }}
                                    className={userPrediction
                                      ? "p-1 text-[#10b981] hover:bg-[#10b981]/15 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#10b981]/20"
                                      : "text-[9px] font-extrabold text-[#10b981] border border-[#10b981]/25 hover:border-[#10b981]/40 bg-[#10b981]/5 hover:bg-[#10b981]/15 px-2.5 py-0.5 rounded-full transition-all cursor-pointer select-none"
                                    }
                                    title={userPrediction ? "Sửa cược" : "Cược ngay"}
                                  >
                                    {userPrediction ? <Edit3 className="h-3 w-3" /> : "Cược ngay"}
                                  </button>
                                )}

                                {/* Admin sửa kèo */}
                                {isAdmin && match.status !== 'FT' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAdminModal(match);
                                    }}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 border border-white/5 rounded-lg transition-colors cursor-pointer"
                                    title="Sửa kèo chấp (Admin)"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Prediction Modal for Users */}
      {selectedMatch && (
        <PredictionModal
          isOpen={isPredictModalOpen}
          onClose={() => setIsPredictModalOpen(false)}
          match={selectedMatch}
          userPrediction={predictions.find(p => p.match_id === selectedMatch.id)}
          onSuccess={handlePredictionSuccess}
        />
      )}

      {/* Admin Handicap Modal */}
      <Portal>
        <AnimatePresence>
          {isAdminModalOpen && selectedAdminMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminModalOpen(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
              />

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
                    Cấu hình kèo chấp Handicap (Bảng)
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
                  {/* Match Info Box */}
                  <div className="flex items-center justify-between bg-[#161822] border border-white/[0.03] rounded-2xl p-5 gap-4">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <img
                        src={selectedAdminMatch.home_logo}
                        className="h-10 w-[60px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5"
                        alt={selectedAdminMatch.home_team}
                      />
                      <TeamName
                        name={selectedAdminMatch.home_team}
                        className="mt-2 text-xs sm:text-sm font-bold text-white max-w-full justify-center"
                      />
                    </div>

                    <div className="text-[10px] font-mono font-bold bg-[#242735] border border-white/[0.08] text-muted-foreground/80 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      vs
                    </div>

                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <img
                        src={selectedAdminMatch.away_logo}
                        className="h-10 w-[60px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5"
                        alt={selectedAdminMatch.away_team}
                      />
                      <TeamName
                        name={selectedAdminMatch.away_team}
                        className="mt-2 text-xs sm:text-sm font-bold text-white max-w-full justify-center"
                      />
                    </div>
                  </div>

                  {/* Select Handicap Team */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Chọn đội chấp
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'none', label: 'Không chấp' },
                        { id: 'home', label: `${translateTeamName(selectedAdminMatch.home_team)} chấp` },
                        { id: 'away', label: `${translateTeamName(selectedAdminMatch.away_team)} chấp` }
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
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Điểm cộng khi dự đoán sai
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tempLossPoints === 0 ? '' : new Intl.NumberFormat('en-US').format(tempLossPoints)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, ''); // Loại bỏ tất cả dấu phẩy
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
                          name="standingsApplyScope"
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
                          name="standingsApplyScope"
                          value="stage"
                          checked={tempApplyScope === 'stage'}
                          onChange={() => setTempApplyScope('stage')}
                          className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                        />
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors">
                          Áp dụng cho toàn bộ <span className="text-amber-400 font-bold">{selectedAdminMatch.stage}</span>
                        </span>
                      </label>

                      {/* Vòng bảng */}
                      {selectedAdminMatch.stage?.startsWith('Bảng') && (
                        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                          <input
                            type="radio"
                            name="standingsApplyScope"
                            value="group_stage"
                            checked={tempApplyScope === 'group_stage'}
                            onChange={() => setTempApplyScope('group_stage')}
                            className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-white transition-colors">
                            Áp dụng cho <span className="text-amber-400 font-bold">tất cả các Bảng (Vòng bảng)</span>
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

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
