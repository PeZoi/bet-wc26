'use client';
// Trigger hot reload for Next.js Turbopack cache
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Match } from '@/types';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import { updateMatchScoreAdmin } from '@/app/actions';
import { RefreshCw, Play, Edit3, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';
import { motion, AnimatePresence } from 'framer-motion';

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

interface AdminClientProps {
  initialMatches: Match[];
}

export default function AdminClient({ initialMatches }: AdminClientProps) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const matches = initialMatches;
  const [syncingMatches, setSyncingMatches] = useState(false);
  const [syncingScores, setSyncingScores] = useState(false);

  // States for Handicap Configuration Modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [tempHandicapTeam, setTempHandicapTeam] = useState<'home' | 'away' | 'none'>('none');
  const [tempHandicapValue, setTempHandicapValue] = useState<number>(0);
  const [tempHomeScore, setTempHomeScore] = useState<number>(0);
  const [tempAwayScore, setTempAwayScore] = useState<number>(0);
  const [tempHomeScore90, setTempHomeScore90] = useState<string>('');
  const [tempAwayScore90, setTempAwayScore90] = useState<string>('');
  const [tempHomePenalty, setTempHomePenalty] = useState<string>('');
  const [tempAwayPenalty, setTempAwayPenalty] = useState<string>('');
  const [tempStatus, setTempStatus] = useState<'NS' | 'LIVE' | 'FT'>('NS');
  const [tempLossPoints, setTempLossPoints] = useState<number>(0);
  const [tempDrawPoints, setTempDrawPoints] = useState<number>(0);
  const [tempApplyScope, setTempApplyScope] = useState<'match' | 'stage' | 'group_stage'>('match');
  const [isSavingHandicap, setIsSavingHandicap] = useState(false);

  const handleOpenEditModal = (match: Match) => {
    setEditingMatch(match);
    setTempHandicapTeam((match.handicap_team as 'home' | 'away' | 'none') || 'none');
    setTempHandicapValue(match.handicap_value ?? 0);
    setTempHomeScore(match.home_score ?? 0);
    setTempAwayScore(match.away_score ?? 0);
    setTempHomeScore90(match.home_score_90 !== null && match.home_score_90 !== undefined ? String(match.home_score_90) : '');
    setTempAwayScore90(match.away_score_90 !== null && match.away_score_90 !== undefined ? String(match.away_score_90) : '');
    setTempHomePenalty(match.home_penalty_score !== null && match.home_penalty_score !== undefined ? String(match.home_penalty_score) : '');
    setTempAwayPenalty(match.away_penalty_score !== null && match.away_penalty_score !== undefined ? String(match.away_penalty_score) : '');
    setTempStatus(match.status as 'NS' | 'LIVE' | 'FT');
    setTempLossPoints(match.loss_points ?? 0);
    setTempDrawPoints(match.draw_points ?? 0);
    setTempApplyScope('match');
  };

  const handleSaveHandicap = async () => {
    if (!editingMatch) return;
    setIsSavingHandicap(true);
    try {
      const hScore90 = tempHomeScore90 === '' ? null : parseInt(tempHomeScore90, 10);
      const aScore90 = tempAwayScore90 === '' ? null : parseInt(tempAwayScore90, 10);
      const hPen = tempHomePenalty === '' ? null : parseInt(tempHomePenalty, 10);
      const aPen = tempAwayPenalty === '' ? null : parseInt(tempAwayPenalty, 10);

      const res = await updateMatchScoreAdmin(
        editingMatch.id,
        tempHomeScore,
        tempAwayScore,
        tempStatus,
        tempHandicapTeam,
        tempHandicapTeam === 'none' ? 0 : tempHandicapValue,
        tempLossPoints,
        tempApplyScope,
        tempDrawPoints,
        hScore90,
        aScore90,
        hPen,
        aPen
      );

      if (res.success) {
        await showAlert('Cập nhật kèo chấp thành công!', { type: 'success', title: 'Thành công' });
        setEditingMatch(null);
        router.refresh();
      } else {
        await showAlert(`Lỗi: ${res.message}`, { type: 'error', title: 'Lỗi' });
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      await showAlert(`Lỗi: ${errMsg}`, { type: 'error', title: 'Lỗi' });
    } finally {
      setIsSavingHandicap(false);
    }
  };

  const handleSyncMatches = async () => {
    setSyncingMatches(true);
    try {
      const res = await fetch('/api/sync-matches');
      const data = await res.json();
      if (data.success) {
        await showAlert(`Thành công: ${data.message} (${data.source})`, { type: 'success', title: 'Thành công' });
        router.refresh();
      } else {
        await showAlert(`Thất bại: ${data.message}`, { type: 'error', title: 'Thất bại' });
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      await showAlert(`Lỗi đồng bộ: ${errMsg}`, { type: 'error', title: 'Lỗi đồng bộ' });
    } finally {
      setSyncingMatches(false);
    }
  };

  const handleSyncScores = async () => {
    setSyncingScores(true);
    try {
      const res = await fetch('/api/sync-scores');
      const data = await res.json();
      if (data.success) {
        await showAlert(data.message, { type: 'success', title: 'Cập nhật tỉ số' });
        router.refresh();
      } else {
        await showAlert(`Thất bại: ${data.message}`, { type: 'error', title: 'Thất bại' });
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      await showAlert(`Lỗi đồng bộ tỉ số: ${errMsg}`, { type: 'error', title: 'Lỗi đồng bộ' });
    } finally {
      setSyncingScores(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Synchronization Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Real Fixtures Sync */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-primary" />
              Đồng bộ lịch thi đấu API
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tải lịch thi đấu World Cup 2026 từ API-Football (Yêu cầu cấu hình RAPIDAPI_KEY).
            </p>
          </div>
          <button
            onClick={() => handleSyncMatches()}
            disabled={syncingMatches}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/95 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingMatches ? 'animate-spin' : ''}`} />
            Đồng bộ từ API
          </button>
        </div>

        {/* Real Live Scores Sync */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Play className="h-4 w-4 text-yellow-500 animate-pulse" />
              Cập nhật tỉ số API
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cập nhật tỉ số thực tế cho các trận đang hoặc đã đấu (Yêu cầu RAPIDAPI_KEY).
            </p>
          </div>
          <button
            onClick={handleSyncScores}
            disabled={syncingScores}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 text-xs font-bold text-background hover:bg-yellow-400 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingScores ? 'animate-spin' : ''}`} />
            Cập nhật tỉ số API
          </button>
        </div>
      </div>

      {/* Manual Match Editor Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
          <h3 className="text-base font-bold text-white">Danh sách trận đấu</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-white/[0.005]">
                <th className="py-3 px-4 w-24">Vòng đấu</th>
                <th className="py-3 px-4">Đội nhà</th>
                <th className="py-3 px-4 text-center w-28">Tỉ số thực tế</th>
                <th className="py-3 px-4">Đội khách</th>
                <th className="py-3 px-4 text-center w-48">Kèo chấp (Handicap)</th>
                <th className="py-3 px-4 text-center w-28">Trạng thái</th>
                <th className="py-3 px-4 text-right w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.map((match) => {
                const hasHandicap = match.handicap_team && match.handicap_team !== 'none' && Number(match.handicap_value || 0) > 0;
                
                return (
                  <tr key={match.id} className="text-sm hover:bg-white/[0.01] transition-colors">
                    {/* Stage */}
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                       {match.stage}
                    </td>

                    {/* Home Team */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={match.home_logo} className="h-5 w-7 object-cover rounded bg-white/5" alt="" />
                        <TeamName name={match.home_team} className="font-semibold text-white max-w-full" />
                      </div>
                    </td>

                    {/* Scores (ReadOnly) */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center font-mono font-bold bg-white/5 border border-white/10 rounded-lg py-1 px-3.5 text-white min-w-[50px]">
                        {match.home_score ?? 0} : {match.away_score ?? 0}
                      </span>
                    </td>

                    {/* Away Team */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={match.away_logo} className="h-5 w-7 object-cover rounded bg-white/5" alt="" />
                        <TeamName name={match.away_team} className="font-semibold text-white max-w-full" />
                      </div>
                    </td>

                    {/* Handicap Display */}
                    <td className="py-3 px-4 text-center">
                      {hasHandicap ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          {match.handicap_team === 'home' ? translateTeamName(match.home_team) : translateTeamName(match.away_team)} chấp {match.handicap_value} trái
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Không chấp</span>
                      )}
                    </td>

                    {/* Status (ReadOnly) */}
                    <td className="py-3 px-4 text-center">
                      {match.status === 'NS' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Chưa đá</span>
                      ) : match.status === 'LIVE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">Đang đá</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Kết thúc</span>
                      )}
                    </td>

                    {/* Edit Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(match)}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all cursor-pointer"
                        title="Thiết lập chấp & Tỉ số (Admin)"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handicap & Match Configuration Dialog */}
      <Portal>
        <AnimatePresence>
          {editingMatch && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingMatch(null)}
                className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative w-full max-w-[500px] max-h-[90vh] flex flex-col bg-[#11131a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] text-white z-10 p-7 text-left"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Cấu hình trận đấu & Điểm số
                  </h3>
                  <button
                    onClick={() => setEditingMatch(null)}
                    className="text-muted-foreground/80 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {/* Match Header Info */}
                  <div className="flex items-center justify-between bg-[#161822] border border-white/[0.03] rounded-2xl p-4 gap-4">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <img 
                        src={editingMatch.home_logo} 
                        className="h-9 w-[54px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5" 
                        alt={editingMatch.home_team} 
                      />
                      <TeamName 
                        name={editingMatch.home_team} 
                        className="mt-2 text-xs font-bold text-white max-w-full justify-center" 
                      />
                    </div>
                    <div className="text-[10px] font-mono font-bold bg-[#242735] border border-white/[0.08] text-muted-foreground/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      vs
                    </div>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <img 
                        src={editingMatch.away_logo} 
                        className="h-9 w-[54px] object-cover rounded-md shadow-md border border-white/[0.06] bg-white/5" 
                        alt={editingMatch.away_team} 
                      />
                      <TeamName 
                        name={editingMatch.away_team} 
                        className="mt-2 text-xs font-bold text-white max-w-full justify-center" 
                      />
                    </div>
                  </div>

                  {/* Status Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Trạng thái trận đấu
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'NS', label: 'Chưa đá' },
                        { id: 'LIVE', label: 'Đang đá (LIVE)' },
                        { id: 'FT', label: 'Kết thúc (FT)' }
                      ].map((statusOpt) => {
                        const isSelected = tempStatus === statusOpt.id;
                        return (
                          <button
                            key={statusOpt.id}
                            type="button"
                            onClick={() => setTempStatus(statusOpt.id as 'NS' | 'LIVE' | 'FT')}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-primary/10 border-primary/45 text-primary'
                                : 'bg-[#181b25]/85 border-white/[0.04] text-muted-foreground/85 hover:bg-[#202432] hover:text-white'
                            }`}
                          >
                            {statusOpt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scores Inputs */}
                  {(tempStatus === 'LIVE' || tempStatus === 'FT') && (
                    <div className="space-y-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                      {/* Tỉ số chung cuộc */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                          Tỉ số chung cuộc (gồm cả hiệp phụ nếu có)
                        </label>
                        <div className="flex items-center justify-center gap-4">
                          <input
                            type="number"
                            min="0"
                            value={tempHomeScore}
                            onChange={(e) => setTempHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/25"
                            placeholder="Home"
                          />
                          <span className="text-muted-foreground font-bold font-mono">:</span>
                          <input
                            type="number"
                            min="0"
                            value={tempAwayScore}
                            onChange={(e) => setTempAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/25"
                            placeholder="Away"
                          />
                        </div>
                      </div>

                      {/* Tỉ số 90 phút (regular time) */}
                      {!editingMatch.stage.toLowerCase().includes('bảng') && !editingMatch.stage.toLowerCase().includes('group') && (
                        <div className="space-y-2 border-t border-white/5 pt-3">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                            Tỉ số phút 90 (để tính kèo)
                          </label>
                          <p className="text-[10px] text-muted-foreground italic mb-1">
                            Nếu trận đấu có hiệp phụ, tỉ số này thường là hoà (VD: 1-1). Nếu để trống, hệ thống sẽ tự lấy tỉ số chung cuộc ở trên.
                          </p>
                          <div className="flex items-center justify-center gap-4">
                            <input
                              type="number"
                              min="0"
                              value={tempHomeScore90}
                              onChange={(e) => setTempHomeScore90(e.target.value)}
                              className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/25"
                              placeholder="Trống"
                            />
                            <span className="text-muted-foreground font-bold font-mono">:</span>
                            <input
                              type="number"
                              min="0"
                              value={tempAwayScore90}
                              onChange={(e) => setTempAwayScore90(e.target.value)}
                              className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/25"
                              placeholder="Trống"
                            />
                          </div>
                        </div>
                      )}

                      {/* Tỉ số Penalty */}
                      {!editingMatch.stage.toLowerCase().includes('bảng') && !editingMatch.stage.toLowerCase().includes('group') && (
                        <div className="space-y-2 border-t border-white/5 pt-3">
                          <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                            Tỉ số loạt sút Penalty (nếu có)
                          </label>
                          <div className="flex items-center justify-center gap-4">
                            <input
                              type="number"
                              min="0"
                              value={tempHomePenalty}
                              onChange={(e) => setTempHomePenalty(e.target.value)}
                              className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/25"
                              placeholder="Trống"
                            />
                            <span className="text-muted-foreground font-bold font-mono">:</span>
                            <input
                              type="number"
                              min="0"
                              value={tempAwayPenalty}
                              onChange={(e) => setTempAwayPenalty(e.target.value)}
                              className="w-20 text-center font-mono font-bold bg-[#181b25]/80 border border-white/[0.08] rounded-xl py-2 px-3 text-white text-base focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/25"
                              placeholder="Trống"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Handicap Team Select */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      Chọn đội chấp (Handicap)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'none', label: 'Không chấp' },
                        { id: 'home', label: `${translateTeamName(editingMatch.home_team)} chấp` },
                        { id: 'away', label: `${translateTeamName(editingMatch.away_team)} chấp` }
                      ].map((option) => {
                        const isSelected = tempHandicapTeam === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setTempHandicapTeam(option.id as 'home' | 'away' | 'none')}
                            className={`py-3 px-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer flex items-center justify-center text-center min-h-[50px] leading-snug ${
                              isSelected
                                ? 'bg-[#0c2a20]/45 border-[#10b981]/60 text-[#10b981]'
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

                  {/* Points Configuration (Loss / Draw) */}
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    {/* Loss Points Input */}
                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                        Điểm cộng khi dự đoán sai trận này
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
                        <div className="grid grid-cols-4 gap-1.5 flex-1">
                          {[0, 10000, 20000, 30000].map((val) => {
                            const isValSelected = tempLossPoints === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTempLossPoints(val)}
                                className={`py-2 px-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                                  isValSelected
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                    : 'bg-[#181b25]/80 border-white/[0.04] text-muted-foreground/80 hover:bg-[#202432] hover:text-white'
                                }`}
                              >
                                {val === 0 ? '0' : `+${val / 1000}k`}
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
                        <div className="grid grid-cols-4 gap-1.5 flex-1">
                          {[0, 5000, 10000, 15000].map((val) => {
                            const isValSelected = tempDrawPoints === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTempDrawPoints(val)}
                                className={`py-2 px-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                                  isValSelected
                                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                                    : 'bg-[#181b25]/80 border-white/[0.04] text-muted-foreground/80 hover:bg-[#202432] hover:text-white'
                                }`}
                              >
                                {val === 0 ? '0' : `+${val / 1000}k`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Scope Select */}
                    <div className="space-y-2 bg-white/[0.01] border border-white/[0.03] p-3 rounded-2xl">
                      <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                        Phạm vi áp dụng (Điểm sai & Điểm hoà)
                      </span>
                      <div className="flex flex-col gap-2 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="applyScope"
                            value="match"
                            checked={tempApplyScope === 'match'}
                            onChange={() => setTempApplyScope('match')}
                            className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground hover:text-white">
                            Chỉ áp dụng cho trận đấu này
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="applyScope"
                            value="stage"
                            checked={tempApplyScope === 'stage'}
                            onChange={() => setTempApplyScope('stage')}
                            className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                          />
                          <span className="text-[11px] font-medium text-muted-foreground hover:text-white">
                            Áp dụng cho toàn bộ vòng đấu ({editingMatch.stage})
                          </span>
                        </label>
                        {(editingMatch.stage.toLowerCase().includes('bảng') || editingMatch.stage.toLowerCase().includes('group')) && (
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="applyScope"
                              value="group_stage"
                              checked={tempApplyScope === 'group_stage'}
                              onChange={() => setTempApplyScope('group_stage')}
                              className="h-4 w-4 rounded-full border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                            />
                            <span className="text-[11px] font-medium text-muted-foreground hover:text-white">
                              Áp dụng cho toàn bộ Vòng bảng
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="py-2 px-5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHandicap}
                    disabled={isSavingHandicap}
                    className="py-2 px-6 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
