'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Match, Prediction, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import MatchCard from '@/components/match-card';
import TournamentBracket from '@/components/tournament-bracket';
import PredictionModal from '@/components/prediction-modal';
import { translateTeamName } from '@/lib/translator';
import { Search, Filter, RefreshCw, Grid, GitFork } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-custom';

interface MatchesListProps {
  initialMatches: Match[];
  initialPredictions: Prediction[];
  allPredictions?: any[];
  isLoggedIn: boolean;
  isAdmin?: boolean;
  initialFilters?: {
    search: string;
    stage: string;
    status: 'all' | 'finished' | 'upcoming';
    view: 'list' | 'bracket';
  };
}

export default function MatchesList({
  initialMatches,
  initialPredictions,
  allPredictions = [],
  isLoggedIn,
  isAdmin = false,
  initialFilters
}: MatchesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showAlert } = useDialog();

  // Khởi tạo các state lọc từ initialFilters (ưu tiên SSR) hoặc URL params fallback
  const [searchTerm, setSearchTerm] = useState(() => initialFilters?.search ?? searchParams.get('search') ?? '');
  const [selectedStage, setSelectedStage] = useState(() => initialFilters?.stage ?? searchParams.get('stage') ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'finished' | 'upcoming'>(() => {
    return initialFilters?.status ?? (searchParams.get('status') as any) ?? 'all';
  });
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>(() => {
    return initialFilters?.view ?? (searchParams.get('view') as any) ?? 'list';
  });

  // Cây thi đấu (Bracket View) tự quản lý trạng thái trong component TournamentBracket

  const predictions = initialPredictions;
  const [isSyncing, setIsSyncing] = useState(false);
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [, setProfile] = useState<Profile | null>(null);

  // Tải thông tin user hiện tại nếu đã đăng nhập để phục vụ việc cập nhật profile sau khi đồng bộ
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        if (currentUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(profileData as Profile);
        }
      } catch (error) {
        console.error('Lỗi khi tải thông tin user trong MatchesList:', error);
      }
    }
    if (isLoggedIn) {
      fetchUserData();
    }
  }, [supabase, isLoggedIn]);

  // Hàm cập nhật URL ngoại tuyến (client-side only) bằng history.replaceState
  // Điều này giúp tránh độ trễ do server-side navigation của Next.js router.
  const updateURL = useCallback((search: string, stage: string, status: string, view: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage !== 'all') params.set('stage', stage);
    if (status !== 'all') params.set('status', status);
    if (view !== 'list') params.set('view', view);

    const newQuery = params.toString();
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;

    window.history.replaceState(null, '', newUrl);
  }, [pathname]);

  // Các event handlers thay đổi bộ lọc lập tức trên client & đồng bộ URL
  const handleStageChange = (stageValue: string) => {
    setSelectedStage(stageValue);
    updateURL(searchTerm, stageValue, statusFilter, viewMode);
  };

  const handleStatusChange = (statusValue: 'all' | 'finished' | 'upcoming') => {
    setStatusFilter(statusValue);
    updateURL(searchTerm, selectedStage, statusValue, viewMode);
  };

  const handleViewChange = (viewValue: 'list' | 'bracket') => {
    setViewMode(viewValue);
    updateURL(searchTerm, selectedStage, statusFilter, viewValue);
  };

  // 1. Debounce cập nhật URL cho ô tìm kiếm
  useEffect(() => {
    const delayDebounceId = setTimeout(() => {
      updateURL(searchTerm, selectedStage, statusFilter, viewMode);
    }, 300);

    return () => clearTimeout(delayDebounceId);
  }, [searchTerm, selectedStage, statusFilter, viewMode, updateURL]);

  // 2. Đồng bộ URL params ngược lại State khi người dùng nhấn nút Back/Forward của trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchTerm(params.get('search') || '');
      setSelectedStage(params.get('stage') || 'all');

      const status = params.get('status') || 'all';
      setStatusFilter((status === 'finished' || status === 'upcoming') ? status : 'all');

      const view = params.get('view') || 'list';
      setViewMode(view === 'bracket' ? 'bracket' : 'list');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. Tự động giãn rộng container chính (<main>) ra hết chiều rộng màn hình khi ở chế độ cây thi đấu
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    if (viewMode === 'bracket') {
      mainEl.style.maxWidth = '100%';
      mainEl.style.paddingLeft = '1.5rem';
      mainEl.style.paddingRight = '1.5rem';
    } else {
      mainEl.style.maxWidth = '';
      mainEl.style.paddingLeft = '';
      mainEl.style.paddingRight = '';
    }

    return () => {
      mainEl.style.maxWidth = '';
      mainEl.style.paddingLeft = '';
      mainEl.style.paddingRight = '';
    };
  }, [viewMode]);

  // Tự động giãn rộng container chính (<main>) ra hết chiều rộng màn hình khi ở chế độ cây thi đấu
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    if (viewMode === 'bracket') {
      mainEl.style.maxWidth = '100%';
      mainEl.style.paddingLeft = '1.5rem';
      mainEl.style.paddingRight = '1.5rem';
    } else {
      mainEl.style.maxWidth = '';
      mainEl.style.paddingLeft = '';
      mainEl.style.paddingRight = '';
    }

    return () => {
      mainEl.style.maxWidth = '';
      mainEl.style.paddingLeft = '';
      mainEl.style.paddingRight = '';
    };
  }, [viewMode]);

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

  const handleSyncScores = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync-scores?wait=true");
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        router.refresh();

        // Cập nhật lại profile sau khi điểm số thay đổi (cho MatchesList)
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (profileData) {
            setProfile(profileData as Profile);
          }
        }

        // Phát sự kiện toàn cục để Navbar cũng tự động cập nhật lại profile/điểm số
        window.dispatchEvent(new Event('sync-scores-success'));

        await showAlert("Cập nhật tỉ số thực tế thành công!", { type: "success", title: "Thành công" });
      } else {
        await showAlert("Cập nhật tỉ số thất bại: " + data.message, { type: "error", title: "Thất bại" });
      }
    } catch (error: unknown) {
      console.error("Lỗi đồng bộ tỉ số:", error);
      const errMsg = error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật tỉ số.";
      await showAlert("Lỗi: " + errMsg, { type: "error", title: "Lỗi" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Convert predictions array to a lookup map for faster rendering
  const predictionMap = new Map<number, Prediction>();
  predictions.forEach(p => predictionMap.set(p.match_id, p));

  // Tính số trận đã đá / tổng số trận cho mỗi stage (vòng đấu/bảng đấu)
  const stageStats = new Map<string, { played: number; total: number }>();
  initialMatches.forEach(m => {
    const stage = m.stage;
    const current = stageStats.get(stage) || { played: 0, total: 0 };
    stageStats.set(stage, {
      played: current.played + (m.status === 'FT' ? 1 : 0),
      total: current.total + 1
    });
  });

  // Filter matches
  const filteredMatches = initialMatches.filter(match => {
    // Stage Filter
    let stageMatch = false;
    if (selectedStage === 'all') {
      stageMatch = true;
    } else if (selectedStage === 'Vòng bảng') {
      const stageLower = match.stage.toLowerCase();
      stageMatch = stageLower.includes('bảng') || stageLower.includes('group');
    } else {
      stageMatch = match.stage.toLowerCase().includes(selectedStage.toLowerCase());
    }

    // Status Filter
    let statusMatch = true;
    if (statusFilter === 'finished') {
      statusMatch = match.status === 'FT' || match.status === 'LIVE';
    } else if (statusFilter === 'upcoming') {
      statusMatch = match.status === 'NS';
    }

    // Search Term Filter (Team name match)
    const searchMatch =
      match.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translateTeamName(match.home_team).toLowerCase().includes(searchTerm.toLowerCase()) ||
      translateTeamName(match.away_team).toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    return stageMatch && statusMatch && searchMatch && opponentsDetermined;
  });

  // Sắp xếp trận đấu đã diễn ra theo thứ tự thời gian giảm dần (mới nhất lên đầu)
  if (statusFilter === 'finished') {
    filteredMatches.sort((a, b) => new Date(b.match_time).getTime() - new Date(a.match_time).getTime());
  }

  // Tính toán số trận đã diễn ra và tổng số trận dựa trên bộ lọc Vòng đấu (selectedStage) và Tìm kiếm (searchTerm)
  const matchesForStats = initialMatches.filter(match => {
    let stageMatch = false;
    if (selectedStage === 'all') {
      stageMatch = true;
    } else if (selectedStage === 'Vòng bảng') {
      const stageLower = match.stage.toLowerCase();
      stageMatch = stageLower.includes('bảng') || stageLower.includes('group');
    } else {
      stageMatch = match.stage.toLowerCase().includes(selectedStage.toLowerCase());
    }

    const searchMatch =
      match.home_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.away_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translateTeamName(match.home_team).toLowerCase().includes(searchTerm.toLowerCase()) ||
      translateTeamName(match.away_team).toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.stage.toLowerCase().includes(searchTerm.toLowerCase());

    return stageMatch && searchMatch;
  });

  const totalMatchesCount = matchesForStats.length;
  const playedMatchesCount = matchesForStats.filter(m => m.status === 'FT').length;

  // Định nghĩa các trận đấu cho cây thi đấu đã được chuyển sang TournamentBracket

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang hiển thị động theo bộ lọc */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3 flex-wrap'>
          <span>Lịch Thi Đấu & Kết Quả</span>
          {totalMatchesCount > 0 && (
            <span className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/25 text-emerald-400/90 px-2.5 py-1 rounded-full select-none shadow-[0_0_12px_-3px_rgba(16,185,129,0.15)]">
              <span className="font-mono font-extrabold text-white bg-emerald-500/25 px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                {playedMatchesCount}/{totalMatchesCount}
              </span>
              <span className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase pr-1 font-sans">
                Trận đã đấu
              </span>
            </span>
          )}
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Theo dõi lịch thi đấu, kết quả cập nhật trực tiếp và dự đoán tỉ số để tích điểm.
        </p>
      </div>

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
                onClick={() => handleViewChange('list')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-initial ${viewMode === 'list'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Grid className="h-3.5 w-3.5" />
                Danh sách
              </button>
              <button
                onClick={() => handleViewChange('bracket')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 sm:flex-initial ${viewMode === 'bracket'
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
              onClick={handleSyncScores}
              disabled={isSyncing}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Cập nhật tỉ số & kết quả mới nhất"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Đang cập nhật...' : 'Cập nhật tỉ số'}
            </button>
          </div>
        </div>

        {/* Row 2: Filters (only in list mode) */}
        {viewMode === 'list' && (
          <div className="border-t border-white/5 pt-4 space-y-4">
            {/* Filter by Match Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 sm:w-20">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span>Trạng thái:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'finished', label: 'Đã diễn ra' },
                  { value: 'upcoming', label: 'Chưa diễn ra' }
                ].map((statusOpt) => (
                  <button
                    key={statusOpt.value}
                    onClick={() => handleStatusChange(statusOpt.value as 'all' | 'finished' | 'upcoming')}
                    className={`text-xs font-bold py-1.5 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${statusFilter === statusOpt.value
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary/20 shadow-md shadow-primary/10'
                      : 'bg-[#181b25]/60 text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/10'
                      }`}
                  >
                    {statusOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Tournament Stage */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-white/[0.03] pt-3.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 sm:w-20">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Vòng đấu:</span>
              </div>

              {/* Scrollable container on mobile, wrapped on larger screens */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {stages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => handleStageChange(stage.value)}
                    className={`text-xs font-bold py-1.5 px-3.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${selectedStage === stage.value
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5'
                      : 'bg-[#181b25]/60 text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/10'
                      }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
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
            {filteredMatches.map((match) => {
              const stats = stageStats.get(match.stage);
              return (
                <div key={match.id} className="h-full">
                  <MatchCard
                    match={match}
                    userPrediction={predictionMap.get(match.id)}
                    matchPredictions={allPredictions.filter(p => p.match_id === match.id)}
                    onPredictClick={handlePredictClick}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                    stagePlayedCount={stats?.played}
                    stageTotalCount={stats?.total}
                  />
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Bracket View Mode */
        <TournamentBracket
          matches={initialMatches}
          predictions={predictions}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          onPredictClick={handlePredictClick}
        />
      )}

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
