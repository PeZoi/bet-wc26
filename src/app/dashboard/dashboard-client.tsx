'use client';

import React, { useState, useEffect } from 'react';
import { Match, Prediction, Profile } from '@/types';
import PredictionModal from '@/components/prediction-modal';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import { Clock, ArrowRight, LayoutDashboard, Compass, Lock, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Xin chào, {userProfile?.display_name}!</h1>
          <p className="text-xs text-muted-foreground">Theo dõi tiến trình dự đoán và thứ hạng của bạn.</p>
        </div>
      </div>

      {/* Bento Grid Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: User Stats */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Thành tích của bạn</h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Hạng #{userRank}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold font-mono text-white">
                {new Intl.NumberFormat('en-US').format(userProfile?.points || 0)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Điểm số</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {userProfile?.exact_scores_count || 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Dự đoán đúng</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold font-mono text-cyan-400">
                {predictions.length}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Đã tham gia</span>
            </div>
          </div>
        </div>

        {/* Card 2: Next Match Countdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Trận kế tiếp</h3>
            {nextMatch && (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {nextMatch.stage}
              </span>
            )}
          </div>

          {nextMatch ? (
            <div className="flex flex-col items-center py-2 space-y-3">
              <div className="flex items-center justify-center gap-3 w-full">
                {/* Đội nhà */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <TeamName 
                    name={nextMatch.home_team} 
                    className="text-sm font-bold text-white max-w-full justify-end" 
                  />
                  <img
                    src={nextMatch.home_logo}
                    alt={nextMatch.home_team}
                    className="h-5 w-7.5 object-cover rounded border border-white/10 bg-white/5 flex-shrink-0 shadow-sm"
                  />
                </div>

                {/* VS */}
                <span className="text-xs text-muted-foreground font-bold flex-shrink-0">vs</span>

                {/* Đội khách */}
                <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                  <img
                    src={nextMatch.away_logo}
                    alt={nextMatch.away_team}
                    className="h-5 w-7.5 object-cover rounded border border-white/10 bg-white/5 flex-shrink-0 shadow-sm"
                  />
                  <TeamName 
                    name={nextMatch.away_team} 
                    className="text-sm font-bold text-white max-w-full justify-start" 
                  />
                </div>
              </div>
              
              {/* Đếm ngược */}
              <div className="font-mono text-2xl font-extrabold text-yellow-400 tracking-tight">
                {countdown}
              </div>

              {/* Dự đoán đã chọn (nếu có) */}
              {predictionMap.has(nextMatch.id) && (
                <div className="flex items-center gap-2 mt-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-xl">
                  <span className="text-[9px] text-muted-foreground font-semibold">Đã cược:</span>
                  {renderPredictionChoice(nextMatch, predictionMap.get(nextMatch.id)!)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-2 italic">
              Không có trận đấu nào sắp diễn ra
            </div>
          )}

          {nextMatch && (
            <button
              onClick={() => handlePredictClick(nextMatch)}
              className={`w-full flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold py-2 transition-all cursor-pointer ${
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
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Bảng xếp hạng nhanh</h3>
            <Link
              href="/leaderboard"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Xem tất cả
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {leaderboard.slice(0, 3).map((profile, idx) => (
              <div key={profile.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground font-bold w-3">{idx + 1}</span>
                  <img
                    src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                    alt={profile.display_name}
                    className="h-5 w-5 rounded-full object-cover bg-white/5"
                  />
                  <span className="font-semibold text-white truncate max-w-[100px]">
                    {profile.display_name}
                  </span>
                </div>
                <span className="font-mono font-bold text-primary">{profile.points}đ</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bento Grid Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 4: Need predictions */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-primary" />
              Chưa dự đoán
            </h3>
            <Link
              href="/matches"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              Xem lịch thi đấu
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {unpredictedMatches.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10 bg-white/[0.01] rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <span>Tuyệt vời! Bạn đã dự đoán tất cả các trận sắp diễn ra.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpredictedMatches.map((match) => (
                <div key={match.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                  <div className="text-[10px] font-semibold text-muted-foreground text-center mb-2">
                    {match.stage}
                  </div>
                  <div className="flex items-between justify-between text-xs py-1.5 gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <img
                        src={match.home_logo}
                        alt=""
                        className="h-3.5 w-5 object-cover rounded-sm bg-white/5 flex-shrink-0"
                      />
                      <TeamName name={match.home_team} className="font-bold text-white max-w-full" />
                    </div>
                    <span className="text-muted-foreground font-mono px-1 flex-shrink-0">vs</span>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                      <TeamName name={match.away_team} className="font-bold text-white max-w-full justify-end" />
                      <img
                        src={match.away_logo}
                        alt=""
                        className="h-3.5 w-5 object-cover rounded-sm bg-white/5 flex-shrink-0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handlePredictClick(match)}
                    className="mt-4 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Dự đoán
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 5: Recent predictions */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-secondary" />
            Dự đoán gần đây
          </h3>

          {userRecentPredictions.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10 italic">
              Bạn chưa có dự đoán nào.
            </div>
          ) : (
            <div className="space-y-3">
              {userRecentPredictions.map((match) => {
                const pred = predictionMap.get(match.id);
                
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between text-xs bg-white/5 border border-white/5 rounded-xl p-3"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <img
                            src={match.home_logo}
                            alt=""
                            className="h-3 w-4 object-cover rounded-sm bg-white/5 flex-shrink-0"
                          />
                          <TeamName name={match.home_team} className="font-bold text-white max-w-[55px]" />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">vs</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <TeamName name={match.away_team} className="font-bold text-white max-w-[55px] justify-end" />
                          <img
                            src={match.away_logo}
                            alt=""
                            className="h-3 w-4 object-cover rounded-sm bg-white/5 flex-shrink-0"
                          />
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        {match.stage}
                      </span>
                    </div>
                     {pred && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {renderPredictionChoice(match, pred)}
                        {match.status === 'FT' && (
                          <span className={`font-mono font-bold ${
                            pred.points_earned === 1 
                              ? 'text-emerald-400' 
                              : pred.points_earned && pred.points_earned > 0 
                                ? 'text-amber-400' 
                                : 'text-muted-foreground'
                          }`}>
                            +{new Intl.NumberFormat('en-US').format(pred.points_earned || 0)}đ
                          </span>
                        )}
                      </div>
                    )}
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
