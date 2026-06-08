'use client';

import React, { useState } from 'react';
import { Match, Prediction } from '@/types';
import MatchCard from '@/components/match-card';
import BracketCard from '@/components/bracket-card';
import PredictionModal from '@/components/prediction-modal';
import { Search, Filter, RefreshCw, Grid, GitFork } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';

interface MatchesListProps {
  initialMatches: Match[];
  initialPredictions: Prediction[];
  isLoggedIn: boolean;
}

export default function MatchesList({
  initialMatches,
  initialPredictions,
  isLoggedIn
}: MatchesListProps) {
  const router = useRouter();
  const { showAlert } = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  const predictions = initialPredictions;
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal State
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group stages for filters
  const stages = [
    { value: 'all', label: 'Tất cả' },
    { value: 'Vòng bảng', label: 'Vòng bảng' },
    { value: 'Vòng 1/32', label: 'Vòng 1/32' },
    { value: 'Vòng 1/16', label: 'Vòng 1/16' },
    { value: 'Tứ kết', label: 'Tứ kết' },
    { value: 'Bán kết', label: 'Bán kết' },
    { value: 'Chung kết', label: 'Chung kết' }
  ];

  const handlePredictClick = (match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handlePredictionSuccess = () => {
    // Refresh the router page to fetch the updated predictions in the Server Component
    router.refresh();
  };

  const handleSyncMatches = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-matches');
      const data = await res.json();
      if (data.success) {
        await showAlert('Đồng bộ lịch thi đấu thành công!', { type: 'success', title: 'Thành công' });
        router.refresh();
      } else {
        await showAlert('Đồng bộ thất bại: ' + data.message, { type: 'error', title: 'Thất bại' });
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Đã xảy ra lỗi';
      await showAlert('Lỗi: ' + errMsg, { type: 'error', title: 'Lỗi' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Convert predictions array to a lookup map for faster rendering
  const predictionMap = new Map<number, Prediction>();
  predictions.forEach(p => predictionMap.set(p.match_id, p));

  // Filter matches
  const filteredMatches = initialMatches.filter(match => {
    // Stage Filter
    const stageMatch =
      selectedStage === 'all' ||
      match.stage.toLowerCase().includes(selectedStage.toLowerCase());

    // Search Term Filter (Team name match)
    const searchMatch =
      match.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.stage.toLowerCase().includes(searchTerm.toLowerCase());

    // Check if opponents are fully determined (not placeholders like TBD, Winner, Runner-up, etc.)
    const skipKeywords = ['tbd', 'winner', 'runner-up', 'loser', '3rd', 'thắng trận', 'thua trận', 'nhất bảng', 'nhì bảng', 'hạng ba', 'group'];
    const isHomePlaceholder = skipKeywords.some(keyword => 
      match.home_team.toLowerCase().includes(keyword)
    );
    const isAwayPlaceholder = skipKeywords.some(keyword => 
      match.away_team.toLowerCase().includes(keyword)
    );
    const opponentsDetermined = !isHomePlaceholder && !isAwayPlaceholder && match.home_team.trim() !== '' && match.away_team.trim() !== '';

    return stageMatch && searchMatch && opponentsDetermined;
  });

  // Prepare tournament bracket data
  const vong16 = initialMatches
    .filter((m) => m.stage === 'Vòng 1/16')
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

  const tuKet = initialMatches
    .filter((m) => m.stage === 'Tứ kết')
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

  const banKet = initialMatches
    .filter((m) => m.stage === 'Bán kết')
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

  const chungKet = initialMatches
    .filter((m) => m.stage === 'Chung kết')
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());

  const vong16Slots = Array.from({ length: 8 }, (_, i) => vong16[i] || null);
  const tuKetSlots = Array.from({ length: 4 }, (_, i) => tuKet[i] || null);
  const banKetSlots = Array.from({ length: 2 }, (_, i) => banKet[i] || null);
  const chungKetSlots = Array.from({ length: 2 }, (_, i) => chungKet[i] || null);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="bg-card/30 border border-white/5 p-4 rounded-2xl backdrop-blur-sm space-y-4">
        {/* Row 1: Search & Toggle & Sync */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm quốc gia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 w-full sm:w-auto justify-center">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-initial ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                Danh sách
              </button>
              <button
                onClick={() => setViewMode('bracket')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-initial ${
                  viewMode === 'bracket'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GitFork className="h-3.5 w-3.5" />
                Cây thi đấu
              </button>
            </div>
          </div>

          {/* Sync Button */}
          <div className="w-full md:w-auto flex justify-end">
            <button
              onClick={handleSyncMatches}
              disabled={isSyncing}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/5 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Đồng bộ lịch thi đấu từ nguồn dữ liệu"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Đang đồng bộ...' : 'Cập nhật lịch'}
            </button>
          </div>
        </div>

        {/* Row 2: Filters (only in list mode) */}
        {viewMode === 'list' && (
          <div className="border-t border-white/5 pt-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span>Bộ lọc:</span>
            </div>
            
            {/* Scrollable container on mobile, wrapped on larger screens */}
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {stages.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => setSelectedStage(stage.value)}
                  className={`text-xs font-bold py-2 px-3.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    selectedStage === stage.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                      : 'bg-background/40 text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        filteredMatches.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-muted-foreground border border-white/5">
            Không tìm thấy trận đấu nào khớp với điều kiện lọc.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <div key={match.id} className="h-full">
                <MatchCard
                  match={match}
                  userPrediction={predictionMap.get(match.id)}
                  onPredictClick={handlePredictClick}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        /* Bracket View Mode */
        <div className="glass-panel rounded-3xl border border-white/5 bg-white/[0.01] overflow-x-auto pb-6 pt-4 px-4 select-none">
          <div className="min-w-[1150px] h-[1080px] flex items-center justify-center relative p-8">
            <div className="flex items-center gap-8">
              {/* Left Side Semifinals & Quarterfinals Tree */}
              <div className="flex flex-col gap-[176px] relative">
                
                {/* Semifinal Branch 1 */}
                <div className="flex items-center">
                  <div className="flex flex-col gap-[80px] relative pr-8 flex-shrink-0">
                    
                    {/* Quarterfinal 1 Branch */}
                    <div className="flex items-center">
                      <div className="flex flex-col gap-4 relative pr-8 flex-shrink-0">
                        <BracketCard match={vong16Slots[0]} userPrediction={vong16Slots[0] ? predictionMap.get(vong16Slots[0].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng A" placeholderAway="Nhì bảng B" matchIndexInfo="Trận 1/16 (1)" />
                        <BracketCard match={vong16Slots[1]} userPrediction={vong16Slots[1] ? predictionMap.get(vong16Slots[1].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng C" placeholderAway="Nhì bảng D" matchIndexInfo="Trận 1/16 (2)" />
                        <div className="absolute right-0 top-[40px] bottom-[40px] w-8 border-r border-y border-white/10 rounded-r" />
                      </div>
                      <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                      <BracketCard match={tuKetSlots[0]} userPrediction={tuKetSlots[0] ? predictionMap.get(tuKetSlots[0].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Trận 1" placeholderAway="Thắng Trận 2" matchIndexInfo="Tứ kết 1" />
                    </div>

                    {/* Quarterfinal 2 Branch */}
                    <div className="flex items-center">
                      <div className="flex flex-col gap-4 relative pr-8 flex-shrink-0">
                        <BracketCard match={vong16Slots[2]} userPrediction={vong16Slots[2] ? predictionMap.get(vong16Slots[2].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng E" placeholderAway="Nhì bảng F" matchIndexInfo="Trận 1/16 (3)" />
                        <BracketCard match={vong16Slots[3]} userPrediction={vong16Slots[3] ? predictionMap.get(vong16Slots[3].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng G" placeholderAway="Nhì bảng H" matchIndexInfo="Trận 1/16 (4)" />
                        <div className="absolute right-0 top-[40px] bottom-[40px] w-8 border-r border-y border-white/10 rounded-r" />
                      </div>
                      <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                      <BracketCard match={tuKetSlots[1]} userPrediction={tuKetSlots[1] ? predictionMap.get(tuKetSlots[1].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Trận 3" placeholderAway="Thắng Trận 4" matchIndexInfo="Tứ kết 2" />
                    </div>

                    <div className="absolute right-0 top-[88px] bottom-[88px] w-8 border-r border-y border-white/10 rounded-r" />
                  </div>
                  <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                  <BracketCard match={banKetSlots[0]} userPrediction={banKetSlots[0] ? predictionMap.get(banKetSlots[0].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Tứ kết 1" placeholderAway="Thắng Tứ kết 2" matchIndexInfo="Bán kết 1" />
                </div>

                {/* Semifinal Branch 2 */}
                <div className="flex items-center">
                  <div className="flex flex-col gap-[80px] relative pr-8 flex-shrink-0">
                    
                    {/* Quarterfinal 3 Branch */}
                    <div className="flex items-center">
                      <div className="flex flex-col gap-4 relative pr-8 flex-shrink-0">
                        <BracketCard match={vong16Slots[4]} userPrediction={vong16Slots[4] ? predictionMap.get(vong16Slots[4].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng I" placeholderAway="Nhì bảng J" matchIndexInfo="Trận 1/16 (5)" />
                        <BracketCard match={vong16Slots[5]} userPrediction={vong16Slots[5] ? predictionMap.get(vong16Slots[5].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng K" placeholderAway="Nhì bảng L" matchIndexInfo="Trận 1/16 (6)" />
                        <div className="absolute right-0 top-[40px] bottom-[40px] w-8 border-r border-y border-white/10 rounded-r" />
                      </div>
                      <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                      <BracketCard match={tuKetSlots[2]} userPrediction={tuKetSlots[2] ? predictionMap.get(tuKetSlots[2].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Trận 5" placeholderAway="Thắng Trận 6" matchIndexInfo="Tứ kết 3" />
                    </div>

                    {/* Quarterfinal 4 Branch */}
                    <div className="flex items-center">
                      <div className="flex flex-col gap-4 relative pr-8 flex-shrink-0">
                        <BracketCard match={vong16Slots[6]} userPrediction={vong16Slots[6] ? predictionMap.get(vong16Slots[6].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng A" placeholderAway="Nhì bảng C" matchIndexInfo="Trận 1/16 (7)" />
                        <BracketCard match={vong16Slots[7]} userPrediction={vong16Slots[7] ? predictionMap.get(vong16Slots[7].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Nhất bảng B" placeholderAway="Nhì bảng D" matchIndexInfo="Trận 1/16 (8)" />
                        <div className="absolute right-0 top-[40px] bottom-[40px] w-8 border-r border-y border-white/10 rounded-r" />
                      </div>
                      <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                      <BracketCard match={tuKetSlots[3]} userPrediction={tuKetSlots[3] ? predictionMap.get(tuKetSlots[3].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Trận 7" placeholderAway="Thắng Trận 8" matchIndexInfo="Tứ kết 4" />
                    </div>

                    <div className="absolute right-0 top-[88px] bottom-[88px] w-8 border-r border-y border-white/10 rounded-r" />
                  </div>
                  <div className="w-8 h-px bg-white/10 flex-shrink-0" />
                  <BracketCard match={banKetSlots[1]} userPrediction={banKetSlots[1] ? predictionMap.get(banKetSlots[1].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Tứ kết 3" placeholderAway="Thắng Tứ kết 4" matchIndexInfo="Bán kết 2" />
                </div>

                <div className="absolute right-0 top-[216px] bottom-[216px] w-8 border-r border-y border-white/10 rounded-r" />
              </div>

              <div className="w-8 h-px bg-white/10 flex-shrink-0" />

              {/* Finals Column (Chung kết & Tranh hạng ba) */}
              <div className="flex flex-col gap-16 ml-4 flex-shrink-0">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block text-center">🏆 Chung kết</span>
                  <BracketCard match={chungKetSlots[0]} userPrediction={chungKetSlots[0] ? predictionMap.get(chungKetSlots[0].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thắng Bán kết 1" placeholderAway="Thắng Bán kết 2" matchIndexInfo="Chung kết" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center">🥉 Tranh hạng ba</span>
                  <BracketCard match={chungKetSlots[1]} userPrediction={chungKetSlots[1] ? predictionMap.get(chungKetSlots[1].id) : undefined} onPredictClick={handlePredictClick} isLoggedIn={isLoggedIn} placeholderHome="Thua Bán kết 1" placeholderAway="Thua Bán kết 2" matchIndexInfo="Tranh hạng ba" />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Prediction Modal */}
      <PredictionModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMatch(null);
        }}
        userPrediction={selectedMatch ? predictionMap.get(selectedMatch.id) : undefined}
        onSuccess={handlePredictionSuccess}
      />
    </div>
  );
}
