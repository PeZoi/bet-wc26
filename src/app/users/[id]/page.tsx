import React from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import TeamLogo from '@/components/team-logo';
import { ChevronLeft, Calendar, Trophy, Target, Award, CheckCircle2, Star, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Prediction, Profile, Match } from '@/types';

export const dynamic = 'force-dynamic';

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id: userId } = await params;

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Fetch User Profile
  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.id}`;

  // 2. Fetch all profiles to calculate rank
  const { data: allProfiles } = await adminSupabase
    .from('profiles')
    .select('id, points, exact_scores_count')
    .order('points', { ascending: false })
    .order('exact_scores_count', { ascending: false });

  const rank = allProfiles ? allProfiles.findIndex(p => p.id === userId) + 1 : 0;

  // 3. Fetch User Predictions joined with Matches
  const { data: predictionsData, error: predsError } = await adminSupabase
    .from('predictions')
    .select(`
      id,
      prediction_choice,
      points_earned,
      is_correct,
      created_at,
      matches:matches!predictions_match_id_fkey(
        id,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_time,
        stage,
        home_score,
        away_score,
        status,
        handicap_team,
        handicap_value
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Map predictions to cleanly format matches
  type PredictionWithMatch = Prediction & { matches: Match };
  const predictions = (predictionsData || []) as unknown as PredictionWithMatch[];

  // Split predictions into Finished and Ongoing/Upcoming
  const finishedPredictions = predictions.filter(p => p.matches?.status === 'FT');
  const activePredictions = predictions.filter(p => p.matches?.status !== 'FT');

  const winRate = finishedPredictions.length > 0
    ? Math.round((profile.exact_scores_count || 0) / finishedPredictions.length * 100)
    : 0;

  // Helpers
  const getPredictionChoiceText = (p: PredictionWithMatch) => {
    const choice = p.prediction_choice;
    const match = p.matches;
    if (!match) return '';

    if (choice === 'home') {
      return (
        <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-[11px] font-bold">
          <TeamLogo src={match.home_logo} alt="" className="h-2.5 w-3.5 object-cover rounded-sm" teamName={match.home_team} />
          <span>{translateTeamName(match.home_team)}</span>
        </span>
      );
    }
    if (choice === 'away') {
      return (
        <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded text-[11px] font-bold">
          <TeamLogo src={match.away_logo} alt="" className="h-2.5 w-3.5 object-cover rounded-sm" teamName={match.away_team} />
          <span>{translateTeamName(match.away_team)}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
        Hòa
      </span>
    );
  };

  const getPointsBadge = (points: number | null) => {
    if (points === null) return null;
    if (points === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Thắng kèo (+1đ)
        </span>
      );
    }
    // Điểm thua > 0 thì hiện badge amber
    if (points > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
          Thua/Hòa kèo (+{new Intl.NumberFormat('en-US').format(points)}đ)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
        Thua/Hòa kèo (0đ)
      </span>
    );
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back to Leaderboard */}
        <Link 
          href="/leaderboard" 
          prefetch={true}
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-6 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại Bảng xếp hạng
        </Link>

        <div className="space-y-8">
          {/* User Profile Banner (Premium Glassmorphism Card) */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0d1220]/80 to-[#141923]/60 p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-black/50">
            {/* Background Glow */}
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-8 justify-between relative z-10">
              
              {/* Left Column: Avatar & Profile Info */}
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {/* Avatar with Glow Ring */}
                <div className="relative group/avatar">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-emerald-500 to-cyan-500 opacity-20 blur-md group-hover/avatar:opacity-40 transition-opacity duration-300" />
                  <div className="h-20 w-20 rounded-full overflow-hidden border border-white/10 bg-[#11141d] flex items-center justify-center relative z-10 shadow-xl transition-transform duration-300 group-hover/avatar:scale-105 ring-4 ring-white/5">
                    <img
                      src={avatarUrl}
                      alt={profile.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-white to-white/70 bg-clip-text select-text">{profile.display_name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm select-none">
                      <Trophy className="h-3.5 w-3.5 fill-amber-500/10" />
                      Thứ hạng #{rank}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider select-none">
                      Thành viên
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Hierarchical Stats Box (Bento Style) */}
              <div className="flex flex-col gap-3.5 w-full md:w-auto max-w-md">
                
                {/* Top Row: Primary Cards (Total Points & Accuracy) */}
                <div className="grid grid-cols-2 gap-3.5 w-full">
                  {/* Total Points */}
                  <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col justify-between h-22 transition-all duration-300 group">
                    <div className="absolute right-2 top-2 text-white/[0.02] group-hover:text-amber-500/5 transition-colors pointer-events-none">
                      <Star className="h-10 w-10" />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Tổng điểm</span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1.5">
                      {new Intl.NumberFormat('en-US').format(profile.points)}đ
                    </span>
                  </div>
                  
                  {/* Win Rate */}
                  <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col justify-between h-22 transition-all duration-300 group">
                    <div className="absolute right-2 top-2 text-white/[0.02] group-hover:text-emerald-500/5 transition-colors pointer-events-none">
                      <TrendingUp className="h-10 w-10" />
                    </div>
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Tỉ lệ đúng</span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1.5">
                      {winRate}%
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Detailed Stats Banner */}
                <div className="grid grid-cols-3 gap-1 bg-[#090d16]/60 border border-white/5 rounded-2xl p-3.5">
                  {/* Thắng kèo */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-emerald-400" />
                      Thắng kèo
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-white mt-1">
                      {profile.exact_scores_count}
                    </span>
                  </div>
                  
                  {/* Điểm thua */}
                  <div className="flex flex-col items-center justify-center text-center border-x border-white/5 px-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-amber-500" />
                      Điểm thua
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-amber-500 mt-1 truncate max-w-full">
                      {new Intl.NumberFormat('en-US').format(profile.total_loss_points ?? 0)}đ
                    </span>
                  </div>

                  {/* Đã cược */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Target className="h-3 w-3 text-cyan-400" />
                      Đã cược
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-white mt-1">
                      {predictions.length}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Predictions lists */}
          <div className="space-y-6">
            <h2 className="text-sm font-black tracking-wider text-muted-foreground uppercase flex items-center gap-2 select-none">
              <Target className="h-4 w-4 text-primary" />
              Lịch sử dự đoán của thành viên
            </h2>

            {predictions.length === 0 ? (
              <div className="glass-panel rounded-2xl p-10 text-center text-xs text-muted-foreground border border-white/5 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                Thành viên này chưa tham gia dự đoán trận đấu nào.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Column 1: Sắp thi đấu & LIVE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center justify-between">
                    <span>Trận sắp diễn ra ({activePredictions.length})</span>
                  </h3>

                  {activePredictions.length === 0 ? (
                    <div className="bg-card/5 border border-white/5 rounded-2xl p-6 text-center text-[11px] text-muted-foreground italic">
                      Không có trận đấu sắp diễn ra nào đã cược.
                    </div>
                  ) : (
                    activePredictions.map(p => {
                      const match = p.matches;
                      const matchTime = new Date(match.match_time).toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Ho_Chi_Minh'
                      });

                      return (
                        <div key={p.id} className="glass-panel rounded-2xl p-4 border border-white/5 space-y-3 hover:border-white/10 transition-colors">
                          {/* Match Stage & Time */}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-muted-foreground uppercase">{match.stage}</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {matchTime}
                            </span>
                          </div>

                          {/* Match Row */}
                          <div className="flex items-center justify-between py-1 text-xs">
                            {/* Home */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo src={match.home_logo} className="h-4.5 w-6 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" teamName={match.home_team} />
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <TeamName name={match.home_team} className="font-bold text-white truncate" />
                                {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-red-400 flex-shrink-0">
                                    (Chấp {match.handicap_value})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* VS */}
                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded uppercase tracking-wider mx-3 flex-shrink-0">
                              {match.status === 'LIVE' ? 'LIVE' : 'SẮP ĐÁ'}
                            </span>

                            {/* Away */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <div className="flex items-center gap-1.5 min-w-0 justify-end truncate">
                                {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-red-400 flex-shrink-0">
                                    (Chấp {match.handicap_value})
                                  </span>
                                )}
                                <TeamName name={match.away_team} className="font-bold text-white truncate justify-end" />
                              </div>
                              <TeamLogo src={match.away_logo} className="h-4.5 w-6 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" teamName={match.away_team} />
                            </div>
                          </div>

                          {/* Prediction display */}
                          <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Đã dự đoán:</span>
                            {getPredictionChoiceText(p)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Column 2: Đã hoàn thành */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center justify-between">
                    <span>Trận đã kết thúc ({finishedPredictions.length})</span>
                  </h3>

                  {finishedPredictions.length === 0 ? (
                    <div className="bg-card/5 border border-white/5 rounded-2xl p-6 text-center text-[11px] text-muted-foreground italic">
                      Chưa có trận đấu nào đã hoàn thành được cược.
                    </div>
                  ) : (
                    finishedPredictions.map(p => {
                      const match = p.matches;
                      
                      // Tính toán background động dựa theo kết quả thắng/hòa/thua kèo (đậm hơn để tăng tương phản)
                      let cardBgClass = "bg-white/[0.02] border-white/5 hover:border-white/10";
                      if (p.is_correct === true || p.points_earned === 1) {
                        cardBgClass = "bg-emerald-500/[0.08] border-emerald-500/30 hover:bg-emerald-500/[0.12]";
                      } else if (p.points_earned !== null && p.points_earned > 0) {
                        // Thua nhưng có điểm thua -> amber
                        cardBgClass = "bg-amber-500/[0.08] border-amber-500/30 hover:bg-amber-500/[0.12]";
                      } else if (p.points_earned === 0) {
                        cardBgClass = "bg-red-500/[0.08] border-red-500/30 hover:bg-red-500/[0.12]";
                      }

                      return (
                        <div key={p.id} className={`rounded-2xl p-4 border space-y-3 transition-all duration-300 ${cardBgClass}`}>
                          {/* Match Stage & Outcome points */}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-muted-foreground uppercase">{match.stage}</span>
                            {getPointsBadge(p.points_earned)}
                          </div>

                          {/* Match Row */}
                          <div className="flex items-center justify-between py-1 text-xs">
                            {/* Home */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <TeamLogo src={match.home_logo} className="h-4.5 w-6 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" teamName={match.home_team} />
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                <TeamName name={match.home_team} className="font-bold text-white truncate" />
                                {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-red-400 flex-shrink-0">
                                    (Chấp {match.handicap_value})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-1.5 font-mono font-extrabold text-sm text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 mx-3 flex-shrink-0">
                              <span>{match.home_score}</span>
                              <span className="text-muted-foreground font-sans text-xs">:</span>
                              <span>{match.away_score}</span>
                            </div>

                            {/* Away */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <div className="flex items-center gap-1.5 min-w-0 justify-end truncate">
                                {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-red-400 flex-shrink-0">
                                    (Chấp {match.handicap_value})
                                  </span>
                                )}
                                <TeamName name={match.away_team} className="font-bold text-white truncate justify-end" />
                              </div>
                              <TeamLogo src={match.away_logo} className="h-4.5 w-6 object-cover rounded-sm bg-white/5 flex-shrink-0" alt="" teamName={match.away_team} />
                            </div>
                          </div>

                          {/* Prediction display */}
                          <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Đã dự đoán:</span>
                            <div className="flex items-center gap-2">
                              {getPredictionChoiceText(p)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8 select-none">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
