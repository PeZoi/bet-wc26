import React from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';
import TeamLogo from '@/components/team-logo';
import { ChevronLeft, Calendar, MapPin, Trophy, Target, Users, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Prediction, Profile } from '@/types';

export const dynamic = 'force-dynamic';

interface MatchDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Helper to parse scorers string from API to an array of cleaner strings.
 */
function parseScorers(scorersStr: string | null | undefined): string[] {
  if (!scorersStr || scorersStr === 'null' || scorersStr === '{}') return [];
  try {
    const clean = scorersStr.replace(/[{}]/g, '').replace(/[“”"']/g, '');
    return clean.split(',').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const matchId = parseInt(id, 10);

  if (isNaN(matchId)) {
    notFound();
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Fetch Match Detail
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    notFound();
  }

  // Lấy session user hiện tại
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // 2. Fetch User Predictions for this Match
  const { data: predictionsData, error: predsError } = await adminSupabase
    .from('predictions')
    .select(`
      id,
      prediction_choice,
      points_earned,
      is_correct,
      created_at,
      user_id,
      profiles:profiles!predictions_user_id_fkey(display_name, avatar_url)
    `)
    .eq('match_id', matchId);

  let predictions = (predictionsData || []) as unknown as (Prediction & { profiles: Profile })[];

  // Fallback: Nếu không lấy được gì (ví dụ do thiếu service_role key ở local) 
  // và người dùng hiện tại đã đăng nhập, hãy dùng client thường lấy dự đoán của chính họ.
  if (predictions.length === 0 && currentUserId) {
    const { data: myPred } = await supabase
      .from('predictions')
      .select(`
        id,
        prediction_choice,
        points_earned,
        is_correct,
        created_at,
        user_id,
        profiles:profiles!predictions_user_id_fkey(display_name, avatar_url)
      `)
      .eq('match_id', matchId)
      .eq('user_id', currentUserId);
      
    if (myPred && myPred.length > 0) {
      predictions = myPred as unknown as (Prediction & { profiles: Profile })[];
    }
  }

  // 3. Calculate statistics
  const totalPredsCount = predictions.length;
  const homeCount = predictions.filter(p => p.prediction_choice === 'home').length;
  const awayCount = predictions.filter(p => p.prediction_choice === 'away').length;

  const homePercent = totalPredsCount > 0 ? Math.round((homeCount / totalPredsCount) * 100) : 0;
  const awayPercent = totalPredsCount > 0 ? 100 - homePercent : 0;

  // Split scorers list
  const homeScorersList = parseScorers(match.home_scorers);
  const awayScorersList = parseScorers(match.away_scorers);

  // Hiển thị toàn bộ dự đoán
  const displayPredictions = predictions;

  // Split predictions into choices for lists
  const homePredictions = displayPredictions.filter(p => p.prediction_choice === 'home');
  const awayPredictions = displayPredictions.filter(p => p.prediction_choice === 'away');

  const matchDate = new Date(match.match_time).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const matchTime = new Date(match.match_time).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link 
          href="/matches" 
          prefetch={true}
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-6 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại Lịch thi đấu
        </Link>

        <div className="space-y-8">
          {/* Match Banner (Glassmorphism card) */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-card/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
            {/* Background Glow */}
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

            <div className="flex flex-col items-center gap-6">
              {/* Match Stage & Time Info */}
              <div className="flex flex-col items-center gap-1.5 text-center select-none">
                <span className="text-[10px] font-black tracking-[0.2em] text-primary bg-primary/10 border border-primary/20 px-3.5 py-1 rounded-full uppercase">
                  {match.stage}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{matchDate} • {matchTime}</span>
                </div>
              </div>

              {/* Main Teams & Score Row */}
              <div className="w-full flex items-center justify-between gap-4 max-w-3xl my-2">
                {/* Home Team */}
                <div className="flex flex-col items-center flex-1 text-center min-w-0">
                  <div className="relative h-[60px] w-[90px] sm:h-[80px] sm:w-[120px] flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                    {match.home_logo ? (
                      <TeamLogo
                        src={match.home_logo}
                        alt={`${match.home_team} flag`}
                        className="h-full w-full object-cover"
                        teamName={match.home_team}
                      />
                    ) : (
                      <div className="text-xl font-bold">{match.home_team.substring(0, 3).toUpperCase()}</div>
                    )}
                  </div>
                  <TeamName 
                    name={match.home_team} 
                    className="mt-3 text-base sm:text-lg font-black text-white max-w-full justify-center" 
                  />
                  {match.handicap_team === 'home' && Number(match.handicap_value || 0) > 0 && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                      Chấp {match.handicap_value}
                    </span>
                  )}
                </div>

                {/* Score Column */}
                <div className="flex flex-col items-center justify-center px-4 min-w-[100px] sm:min-w-[140px]">
                  {match.status === 'FT' || match.status === 'LIVE' ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3 text-4xl sm:text-5xl font-mono font-black tracking-tight text-white bg-white/5 border border-white/15 px-5 py-2.5 rounded-2xl shadow-inner">
                        <span>{match.home_score ?? 0}</span>
                        <span className="text-muted-foreground font-sans text-3xl font-light">:</span>
                        <span>{match.away_score ?? 0}</span>
                      </div>
                      {match.status === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Trực tiếp
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-muted-foreground bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Kết thúc
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                        VS
                      </span>
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full mt-2 font-bold uppercase tracking-wider">
                        Sắp đá
                      </span>
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center flex-1 text-center min-w-0">
                  <div className="relative h-[60px] w-[90px] sm:h-[80px] sm:w-[120px] flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg hover:scale-105 transition-transform duration-300">
                    {match.away_logo ? (
                      <TeamLogo
                        src={match.away_logo}
                        alt={`${match.away_team} flag`}
                        className="h-full w-full object-cover"
                        teamName={match.away_team}
                      />
                    ) : (
                      <div className="text-xl font-bold">{match.away_team.substring(0, 3).toUpperCase()}</div>
                    )}
                  </div>
                  <TeamName 
                    name={match.away_team} 
                    className="mt-3 text-base sm:text-lg font-black text-white max-w-full justify-center" 
                  />
                  {match.handicap_team === 'away' && Number(match.handicap_value || 0) > 0 && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                      Chấp {match.handicap_value}
                    </span>
                  )}
                </div>
              </div>

              {/* Goals & Scorers Row (Symmetric display) */}
              {(homeScorersList.length > 0 || awayScorersList.length > 0) && (
                <div className="w-full max-w-xl border-t border-white/5 pt-4 flex gap-4 text-xs">
                  {/* Home Scorers (Align Right) */}
                  <div className="flex-1 text-right space-y-1 pr-2 border-r border-white/5">
                    {homeScorersList.map((scorer, i) => (
                      <div key={i} className="flex items-center justify-end gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium">
                        <span>{scorer}</span>
                        <span className="text-[10px]" role="img" aria-label="goal">⚽</span>
                      </div>
                    ))}
                  </div>
                  {/* Away Scorers (Align Left) */}
                  <div className="flex-1 text-left space-y-1 pl-2">
                    {awayScorersList.map((scorer, i) => (
                      <div key={i} className="flex items-center justify-start gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium">
                        <span className="text-[10px]" role="img" aria-label="goal">⚽</span>
                        <span>{scorer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Predictions Breakdown & Community Stats */}
          <div className="bg-card/20 border border-white/5 rounded-3xl p-6 backdrop-blur-sm space-y-5">
            <h2 className="text-sm font-black tracking-wider text-muted-foreground uppercase flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Tỷ lệ dự đoán từ cộng đồng
            </h2>

            {totalPredsCount === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                <HelpCircle className="h-5 w-5 text-muted-foreground/50" />
                Chưa có ai tham gia dự đoán trận đấu này. Hãy là người đầu tiên!
              </div>
            ) : (
              <div className="space-y-4">
                {/* Combined Progress Bar Chart */}
                <div className="h-3.5 w-full flex rounded-full overflow-hidden bg-white/5 border border-white/5">
                  {homePercent > 0 && (
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500" 
                      style={{ width: `${homePercent}%` }} 
                      title={`${translateTeamName(match.home_team)} thắng: ${homePercent}%`}
                    />
                  )}
                  {awayPercent > 0 && (
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500" 
                      style={{ width: `${awayPercent}%` }} 
                      title={`${translateTeamName(match.away_team)} thắng: ${awayPercent}%`}
                    />
                  )}
                </div>

                {/* Legend & Count details */}
                <div className="grid grid-cols-2 gap-4 text-center max-w-md mx-auto">
                  {/* Home Win Label */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5 justify-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {translateTeamName(match.home_team)} thắng
                    </span>
                    <span className="text-lg font-mono font-black text-white mt-1">{homePercent}%</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">({homeCount} người)</span>
                  </div>

                  {/* Away Win Label */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] font-black text-cyan-400 flex items-center gap-1.5 justify-center">
                      <span className="h-2 w-2 rounded-full bg-cyan-500" />
                      {translateTeamName(match.away_team)} thắng
                    </span>
                    <span className="text-lg font-mono font-black text-white mt-1">{awayPercent}%</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">({awayCount} người)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Predictions Detail List Columns */}
          <div className="space-y-5">
            <h2 className="text-sm font-black tracking-wider text-muted-foreground uppercase flex items-center gap-2 select-none">
              <Users className="h-4 w-4 text-primary" />
              Danh sách chi tiết dự đoán ({totalPredsCount} người tham gia)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Home Team Win */}
              <div className="bg-card/10 border border-white/5 rounded-2xl p-4 flex flex-col h-[400px] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Bắt {translateTeamName(match.home_team)} ({homeCount})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {homePredictions.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-muted-foreground italic">Chưa có ai bắt lựa chọn này.</div>
                  ) : (
                    homePredictions.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-xs hover:bg-white/[0.04] transition-colors">
                        <Link 
                          href={`/users/${p.user_id}`} 
                          prefetch={true}
                          className="flex items-center gap-2 min-w-0 hover:text-primary transition-colors cursor-pointer group"
                        >
                          <img 
                            src={p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} 
                            className="h-6 w-6 rounded-full bg-white/5 object-cover transition-transform group-hover:scale-105" 
                            alt="" 
                          />
                          <span className="font-bold text-white truncate group-hover:underline">{p.profiles?.display_name || 'Người chơi'}</span>
                        </Link>
                        {match.status === 'FT' && p.points_earned !== null && (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                            p.points_earned === 1 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                              : p.points_earned > 0 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-white/5 text-muted-foreground border border-white/5'
                          }`}>
                            {p.points_earned === 1 ? '+1đ' : p.points_earned > 0 ? `+${new Intl.NumberFormat('en-US').format(p.points_earned)}đ` : '0đ'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Away Team Win */}
              <div className="bg-card/10 border border-white/5 rounded-2xl p-4 flex flex-col h-[400px] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                  <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    Bắt {translateTeamName(match.away_team)} ({awayCount})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {awayPredictions.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-muted-foreground italic">Chưa có ai bắt lựa chọn này.</div>
                  ) : (
                    awayPredictions.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-xs hover:bg-white/[0.04] transition-colors">
                        <Link 
                          href={`/users/${p.user_id}`} 
                          prefetch={true}
                          className="flex items-center gap-2 min-w-0 hover:text-primary transition-colors cursor-pointer group"
                        >
                          <img 
                            src={p.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} 
                            className="h-6 w-6 rounded-full bg-white/5 object-cover transition-transform group-hover:scale-105" 
                            alt="" 
                          />
                          <span className="font-bold text-white truncate group-hover:underline">{p.profiles?.display_name || 'Người chơi'}</span>
                        </Link>
                        {match.status === 'FT' && p.points_earned !== null && (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                            p.points_earned === 1 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                              : p.points_earned > 0 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-white/5 text-muted-foreground border border-white/5'
                          }`}>
                            {p.points_earned === 1 ? '+1đ' : p.points_earned > 0 ? `+${new Intl.NumberFormat('en-US').format(p.points_earned)}đ` : '0đ'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8 select-none">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
