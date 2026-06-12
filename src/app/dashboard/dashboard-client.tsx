'use client';

import React, { useState, useEffect } from 'react';
import { Match, Prediction, Profile } from '@/types';
import PredictionModal from '@/components/prediction-modal';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import { Clock, ArrowRight, LayoutDashboard, Compass, Lock, CheckCircle2, Trophy, Award, Star, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardClientProps {
  userProfile: Profile | null;
  userRank: string;
  matches: Match[];
  predictions: Prediction[];
  leaderboard: Profile[];
  isLoggedIn: boolean;
}

export default function DashboardClient({
  userProfile,
  userRank,
  matches,
  predictions,
  leaderboard,
  isLoggedIn
}: DashboardClientProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Map predictions for quick lookup
  const predictionMap = new Map<number, Prediction>();
  predictions.forEach(p => predictionMap.set(p.match_id, p));

  // Find the next upcoming match (Not Started and in the future) derived directly from props
  const skipKeywords = ['tbd', 'winner', 'runner-up', 'loser', '3rd', 'thắng trận', 'thua trận', 'nhất bảng', 'nhì bảng', 'hạng ba', 'group'];
  const isDetermined = (match: Match) => {
    const isHomePlaceholder = skipKeywords.some(keyword => 
      match.home_team.toLowerCase().includes(keyword)
    );
    const isAwayPlaceholder = skipKeywords.some(keyword => 
      match.away_team.toLowerCase().includes(keyword)
    );
    return !isHomePlaceholder && !isAwayPlaceholder && match.home_team.trim() !== '' && match.away_team.trim() !== '';
  };

  const upcoming = matches
    .filter(m => m.status === 'NS' && isDetermined(m) && (now === null || new Date(m.match_time).getTime() > now))
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());
  const nextMatch = upcoming.length > 0 ? upcoming[0] : null;

  // Countdown timer for the next match
  useEffect(() => {
    if (!nextMatch) return;

    const updateTimer = () => {
      const matchTime = new Date(nextMatch.match_time).getTime();
      const difference = matchTime - Date.now();

      if (difference <= 0) {
        setCountdown('Đã bắt đầu');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let str = '';
      if (days > 0) str += `${days} ngày `;
      str += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setCountdown(str);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const handlePredictClick = (match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  const renderPredictionChoice = (m: Match, p: Prediction) => {
    const choice = p.prediction_choice;

    if (choice === 'home') {
      return (
        <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-[10px] font-bold">
          <img src={m.home_logo} className="h-2.5 w-3.5 object-cover rounded-sm bg-white/5" alt="" />
          {translateTeamName(m.home_team)}
        </span>
      );
    }
    if (choice === 'away') {
      return (
        <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-[10px] font-bold">
          <img src={m.away_logo} className="h-2.5 w-3.5 object-cover rounded-sm bg-white/5" alt="" />
          {translateTeamName(m.away_team)}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold">
        Hòa
      </span>
    );
  };

  // Get upcoming unpredicted matches (only determined ones)
  const unpredictedMatches = matches
    .filter(m => m.status === 'NS' && isDetermined(m) && !predictionMap.has(m.id))
    .slice(0, 3);

  // Get user's recent predictions
  const userRecentPredictions = matches
    .filter(m => predictionMap.has(m.id))
    .slice(0, 3);

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Bảng tin cá nhân đang khóa</h2>
          <p className="text-sm text-muted-foreground max-w-[45ch]">
            Vui lòng đăng nhập bằng tài khoản Google để tham gia dự đoán kết quả và theo dõi thứ hạng của mình.
          </p>
        </div>
      </div>
    );
  }

  // Chỉ tính tỉ lệ chính xác dựa trên các trận đã kết thúc (status === 'FT') mà user đã cược
  const finishedPredictionsCount = predictions.filter(p => {
    const match = matches.find(m => m.id === p.match_id);
    return match?.status === 'FT';
  }).length;

  const winRate = finishedPredictionsCount > 0 
    ? Math.round((userProfile?.exact_scores_count || 0) / finishedPredictionsCount * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1220]/50 p-6 flex flex-col sm:flex-row items-center gap-5 justify-between backdrop-blur-md shadow-2xl shadow-black/40">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-[50px] pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-secondary/5 blur-[50px] pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <img src={userProfile?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Bảng tin cá nhân
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1 truncate">Xin chào, {userProfile?.display_name}!</h1>
            <p className="text-xs text-muted-foreground truncate">Theo dõi tiến trình dự đoán và nâng cao thứ hạng của bạn.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-white relative z-10 w-full sm:w-auto justify-center sm:justify-start">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          World Cup 2026 Prediction Hub
        </div>
      </div>

      {/* Bento Grid Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: User Stats */}
        <div className="relative overflow-hidden glass-panel rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 shadow-lg shadow-indigo-500/5 flex flex-col justify-between space-y-6 group">
          <div className="absolute -right-8 -bottom-8 h-28 w-28 text-white/[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-500">
            <Trophy className="h-full w-full" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase">Thành tích của bạn</h3>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-mono shadow-sm">
              <Award className="h-3.5 w-3.5" />
              Hạng #{userRank}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-3 hover:bg-white/[0.04] transition-colors">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400" />
                Điểm thua
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
                {new Intl.NumberFormat('en-US').format(userProfile?.total_loss_points ?? 0)}đ
              </span>
            </div>
            <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-3 hover:bg-white/[0.04] transition-colors">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Trophy className="h-3 w-3 text-emerald-400" />
                Đúng
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
                {userProfile?.exact_scores_count || 0}
              </span>
            </div>
            <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-3 hover:bg-white/[0.04] transition-colors">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Target className="h-3 w-3 text-cyan-400" />
                Cược
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-1">
                {predictions.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-extrabold">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                TỶ LỆ CHÍNH XÁC
              </span>
              <span className="text-emerald-400 font-mono">{winRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }} />
            </div>
          </div>
        </div>

        {/* Card 2: Next Match Countdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 bg-[#0d1220]/45 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase">Trận kế tiếp</h3>
            {nextMatch && (
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 tracking-wider">
                {nextMatch.stage}
              </span>
            )}
          </div>

          {nextMatch ? (
            <div className="flex flex-col items-center py-1 space-y-3.5">
              <div className="flex items-center justify-center gap-3 w-full">
                {/* Đội nhà */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <TeamName 
                    name={nextMatch.home_team} 
                    className="text-xs font-black text-white max-w-full justify-end truncate" 
                  />
                  <img
                    src={nextMatch.home_logo}
                    alt={nextMatch.home_team}
                    className="h-4.5 w-6.5 object-cover rounded border border-white/10 bg-white/5 flex-shrink-0 shadow-md"
                  />
                </div>

                {/* VS */}
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md border border-white/5">vs</span>

                {/* Đội khách */}
                <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                  <img
                    src={nextMatch.away_logo}
                    alt={nextMatch.away_team}
                    className="h-4.5 w-6.5 object-cover rounded border border-white/10 bg-white/5 flex-shrink-0 shadow-md"
                  />
                  <TeamName 
                    name={nextMatch.away_team} 
                    className="text-xs font-black text-white max-w-full justify-start truncate" 
                  />
                </div>
              </div>
              
              {/* Đếm ngược */}
              <div className="font-mono text-2xl font-black text-yellow-400 tracking-tight bg-yellow-500/5 border border-yellow-500/10 px-4 py-1.5 rounded-2xl w-full text-center">
                {countdown}
              </div>

              {/* Dự đoán đã chọn (nếu có) */}
              {predictionMap.has(nextMatch.id) && (
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-2xl w-full justify-center">
                  <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-wider">Lựa chọn:</span>
                  {renderPredictionChoice(nextMatch, predictionMap.get(nextMatch.id)!)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-6 italic flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
              Không có trận đấu nào sắp diễn ra
            </div>
          )}

          {nextMatch && (
            <button
              onClick={() => handlePredictClick(nextMatch)}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl text-xs font-black py-2.5 transition-all active:scale-[0.98] cursor-pointer ${
                predictionMap.has(nextMatch.id)
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/25'
              }`}
            >
              {predictionMap.has(nextMatch.id) ? 'Sửa dự đoán' : 'Dự đoán ngay'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Card 3: Leaderboard Snippet */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 bg-[#0d1220]/45 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase">Xếp hạng nhanh</h3>
            <Link
              href="/leaderboard"
              className="text-xs font-black text-primary hover:underline flex items-center gap-0.5"
            >
              Xem tất cả
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {leaderboard.slice(0, 3).map((profile, idx) => {
              const badgeColors = [
                'bg-amber-500/15 border-amber-500/30 text-amber-400', // Top 1 Gold
                'bg-slate-300/15 border-slate-300/30 text-slate-300', // Top 2 Silver
                'bg-amber-700/15 border-amber-700/30 text-amber-600', // Top 3 Bronze
              ];
              return (
                <div key={profile.id} className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/5 rounded-2xl p-2 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`font-mono font-black text-[10px] w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 ${badgeColors[idx] || 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                      {idx + 1}
                    </span>
                    <img
                      src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                      alt={profile.display_name}
                      className="h-6 w-6 rounded-full object-cover bg-white/5 border border-white/10"
                    />
                    <span className="font-bold text-white truncate max-w-[120px]">
                      {profile.display_name}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">{profile.points}đ</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bento Grid Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 4: Need predictions */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 border border-white/10 bg-[#0d1220]/45 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-primary" />
              Chưa dự đoán
            </h3>
            <Link
              href="/matches"
              className="text-xs font-black text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              Xem lịch thi đấu
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {unpredictedMatches.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12 bg-white/[0.01] rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center space-y-2.5">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
              <span className="font-bold text-white">Tuyệt vời! Bạn đã dự đoán tất cả các trận sắp diễn ra.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {unpredictedMatches.map((match) => (
                <div key={match.id} className="bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group">
                  <div className="text-[10px] font-extrabold text-muted-foreground text-center mb-2.5 uppercase tracking-wider pb-2 border-b border-white/5 flex items-center justify-between">
                    <span>{match.stage}</span>
                    <span className="font-mono text-primary">
                      {new Date(match.match_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  
                  {/* Vertical Team Rows to prevent truncation */}
                  <div className="space-y-3 my-2 flex-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={match.home_logo}
                        alt=""
                        className="h-4 w-5.5 object-cover rounded-sm border border-white/10 bg-white/5 flex-shrink-0 shadow-sm"
                      />
                      <TeamName name={match.home_team} className="font-bold text-xs text-white truncate max-w-full" />
                    </div>
                    <div className="h-px bg-white/[0.03] relative">
                      <span className="absolute left-2.5 -top-2 text-[8px] font-black text-muted-foreground uppercase bg-[#0e1220] px-1.5 border border-white/5 rounded">vs</span>
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={match.away_logo}
                        alt=""
                        className="h-4 w-5.5 object-cover rounded-sm border border-white/10 bg-white/5 flex-shrink-0 shadow-sm"
                      />
                      <TeamName name={match.away_team} className="font-bold text-xs text-white truncate max-w-full" />
                    </div>
                  </div>

                  <button
                    onClick={() => handlePredictClick(match)}
                    className="mt-4 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl py-2 text-xs font-black transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Dự đoán
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 5: Recent predictions */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 bg-[#0d1220]/45 space-y-5">
          <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-secondary" />
            Dự đoán gần đây
          </h3>

          {userRecentPredictions.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12 italic bg-white/[0.01] rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center gap-2">
              <Compass className="h-6 w-6 text-muted-foreground/30" />
              Bạn chưa có dự đoán nào.
            </div>
          ) : (
            <div className="space-y-3">
              {userRecentPredictions.map((match) => {
                const pred = predictionMap.get(match.id);
                
                return (
                  <div
                    key={match.id}
                    className="bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] rounded-2xl p-3 flex flex-col gap-2 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black uppercase tracking-wider pb-1.5 border-b border-white/[0.03]">
                      <span>{match.stage}</span>
                      {match.status === 'FT' ? (
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Kết thúc</span>
                      ) : (
                        <span className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">Chưa diễn ra</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {/* Stacked teams vertically to avoid label cutoff */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={match.home_logo}
                            alt=""
                            className="h-3 w-4.5 object-cover rounded-sm bg-white/5 flex-shrink-0"
                          />
                          <TeamName name={match.home_team} className="font-bold text-xs text-white truncate max-w-[100px]" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={match.away_logo}
                            alt=""
                            className="h-3 w-4.5 object-cover rounded-sm bg-white/5 flex-shrink-0"
                          />
                          <TeamName name={match.away_team} className="font-bold text-xs text-white truncate max-w-[100px]" />
                        </div>
                      </div>
                      
                      {/* Prediction Choice and Result Points */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pl-2">
                        {pred && renderPredictionChoice(match, pred)}
                        {match.status === 'FT' && pred && (
                          <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                            pred.points_earned === 1 
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                              : pred.points_earned && pred.points_earned > 0 
                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                                : 'text-muted-foreground bg-white/5 border-white/10'
                          }`}>
                            +{new Intl.NumberFormat('en-US').format(pred.points_earned || 0)}đ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal */}
      <PredictionModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMatch(null);
        }}
        userPrediction={selectedMatch ? predictionMap.get(selectedMatch.id) : undefined}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

