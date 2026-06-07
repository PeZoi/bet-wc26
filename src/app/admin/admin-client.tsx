'use client';

import React, { useState } from 'react';
import { Match } from '@/types';
import { updateMatchScoreAdmin } from '@/app/actions';
import { RefreshCw, Save, Play, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminClientProps {
  initialMatches: Match[];
}

type EditScoreState = {
  [key: number]: { home: number; away: number; status: 'NS' | 'LIVE' | 'FT' };
};

export default function AdminClient({ initialMatches }: AdminClientProps) {
  const router = useRouter();
  const matches = initialMatches;
  const [syncingMatches, setSyncingMatches] = useState(false);
  const [syncingScores, setSyncingScores] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  // Local state for inline inputs
  const [editScores, setEditScores] = useState<EditScoreState>(() => {
    const initial: EditScoreState = {};
    initialMatches.forEach((m) => {
      initial[m.id] = {
        home: m.home_score ?? 0,
        away: m.away_score ?? 0,
        status: m.status,
      };
    });
    return initial;
  });

  const handleInputChange = (
    matchId: number,
    field: 'home' | 'away' | 'status',
    value: number | 'NS' | 'LIVE' | 'FT'
  ) => {
    setEditScores((prev) => {
      const current = prev[matchId] || { home: 0, away: 0, status: 'NS' as const };
      const updated = { ...current };
      if (field === 'status') {
        updated.status = value as 'NS' | 'LIVE' | 'FT';
      } else {
        updated[field] = value as number;
      }
      return {
        ...prev,
        [matchId]: updated,
      };
    });
  };

  const handleSyncMatches = async (useMock = false) => {
    setSyncingMatches(true);
    try {
      const endpoint = useMock ? '/api/sync-matches?mock=true' : '/api/sync-matches';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        alert(`Thành công: ${data.message} (${data.source})`);
        router.refresh();
      } else {
        alert(`Thất bại: ${data.message}`);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert(`Lỗi đồng bộ: ${errMsg}`);
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
        alert(data.message);
        router.refresh();
      } else {
        alert(`Thất bại: ${data.message}`);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert(`Lỗi đồng bộ tỉ số: ${errMsg}`);
    } finally {
      setSyncingScores(false);
    }
  };

  const handleSaveScore = async (matchId: number) => {
    setUpdatingMatchId(matchId);
    const editData = editScores[matchId];
    try {
      const res = await updateMatchScoreAdmin(
        matchId,
        editData.home,
        editData.away,
        editData.status
      );

      if (res.success) {
        alert(res.message);
        router.refresh();
      } else {
        alert(`Lỗi: ${res.message}`);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Lỗi không xác định';
      alert(`Lỗi: ${errMsg}`);
    } finally {
      setUpdatingMatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Synchronization Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Force Mock Seed */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-400" />
              Khởi tạo dữ liệu mẫu
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1">
              Ghi đè/Seeding dữ liệu mẫu gồm 12 trận mở màn (không cần cấu hình API Key).
            </p>
          </div>
          <button
            onClick={() => handleSyncMatches(true)}
            disabled={syncingMatches}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white hover:bg-white/10 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingMatches ? 'animate-spin' : ''}`} />
            Seed dữ liệu mẫu
          </button>
        </div>

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
            onClick={() => handleSyncMatches(false)}
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
                <th className="py-3 px-4 w-32">Trạng thái</th>
                <th className="py-3 px-4 text-right w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.map((match) => {
                const edit = editScores[match.id] || { home: 0, away: 0, status: 'NS' };
                const isUpdating = updatingMatchId === match.id;

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
                        <span className="font-semibold text-white">{match.home_team}</span>
                      </div>
                    </td>

                    {/* Scores Inputs */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={edit.home}
                          onChange={(e) => handleInputChange(match.id, 'home', parseInt(e.target.value) || 0)}
                          className="w-10 text-center font-mono font-bold bg-white/5 border border-white/10 rounded py-1 text-white focus:outline-none focus:border-primary/50"
                        />
                        <span className="text-muted-foreground font-bold">:</span>
                        <input
                          type="number"
                          min="0"
                          value={edit.away}
                          onChange={(e) => handleInputChange(match.id, 'away', parseInt(e.target.value) || 0)}
                          className="w-10 text-center font-mono font-bold bg-white/5 border border-white/10 rounded py-1 text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </td>

                    {/* Away Team */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img src={match.away_logo} className="h-5 w-7 object-cover rounded bg-white/5" alt="" />
                        <span className="font-semibold text-white">{match.away_team}</span>
                      </div>
                    </td>

                    {/* Status Select */}
                    <td className="py-3 px-4">
                      <select
                        value={edit.status}
                        onChange={(e) => handleInputChange(match.id, 'status', e.target.value as 'NS' | 'LIVE' | 'FT')}
                        className="bg-white/5 border border-white/10 rounded py-1.5 px-2 text-xs font-semibold text-white focus:outline-none focus:border-primary/50 w-full cursor-pointer"
                      >
                        <option value="NS" className="bg-background">NS (Chưa đá)</option>
                        <option value="LIVE" className="bg-background">LIVE (Đang đá)</option>
                        <option value="FT" className="bg-background">FT (Kết thúc)</option>
                      </select>
                    </td>

                    {/* Save Button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSaveScore(match.id)}
                        disabled={isUpdating}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50"
                        title="Lưu tỉ số"
                      >
                        {isUpdating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
