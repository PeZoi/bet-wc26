import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import MatchCard from '@/components/match-card';
import { Trophy, ArrowRight, ShieldCheck, Flame, Star } from 'lucide-react';
import { Match, Profile, Prediction } from '@/types';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  let matches: Match[] = [];
  let profiles: Profile[] = [];
  let predictions: Prediction[] = [];
  let user: User | null = null;
  let isLoggedIn = false;
  let isAdmin = false;

  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
    isLoggedIn = !!user;

    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((email) => email.trim().toLowerCase());
    isAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false;

    // Fetch upcoming matches
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true })
      .limit(3);
    
    matches = dbMatches || [];

    // Fetch user predictions if logged in
    if (user) {
      const { data: dbPredictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);
      predictions = dbPredictions || [];
    }

    // Fetch top 3 leaderboards
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .order('exact_scores_count', { ascending: false })
      .limit(3);
    
    profiles = dbProfiles || [];
  } catch (error) {
    console.error('Database connection failed:', error);
    matches = [];
    profiles = [
      { id: '1', display_name: 'Minh Hoàng', points: 12, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=hoang' },
      { id: '2', display_name: 'Thanh Thảo', points: 9, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=thao' },
      { id: '3', display_name: 'Duy Khánh', points: 7, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=khanh' }
    ] as Profile[];
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 -z-10 h-[250px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Flame className="h-3.5 w-3.5" />
                World Cup 2026 Prediction Hub
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-tight">
                Dự Đoán Kết Quả <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Leo Hạng Cùng Bạn Bè
                </span>
              </h1>
              <p className="max-w-[55ch] text-base md:text-lg text-muted-foreground leading-relaxed">
                Nơi thử tài tiên tri kết quả các trận cầu nảy lửa tại World Cup 2026. Giải đấu phi thương mại, kết nối đam mê bóng đá trong nhóm của bạn.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/dashboard"}
                  prefetch={true}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-lg shadow-primary/25 cursor-pointer"
                >
                  Tham gia ngay
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/rules"
                  prefetch={true}
                  className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Xem thể lệ tính điểm
                </Link>
              </div>
            </div>

            {/* Right Column Visual / Mini-Leaderboard */}
            <div className="lg:col-span-5">
              <div className="glass-panel rounded-3xl p-6 relative border border-white/10">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-16 w-16 text-yellow-400 opacity-20">
                  <Star className="h-full w-full fill-yellow-400" />
                </div>
                
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top Tiên Tri Vùng Vịnh
                </h3>
                
                <div className="space-y-4">
                  {profiles.map((profile, index) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-muted-foreground w-4 text-center">
                          {index + 1}
                        </span>
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          className="h-9 w-9 rounded-full bg-white/5"
                        />
                        <span className="text-sm font-bold text-white">
                          {profile.display_name}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                        {profile.points}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Matches */}
      <section className="py-16 border-t border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Trận đấu mở màn sắp diễn ra
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Nhập dự đoán trước 5 phút trước khi bóng lăn để được tính điểm.
              </p>
            </div>
            <Link
              href="/matches"
              prefetch={true}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Xem tất cả trận đấu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => {
              const userPred = predictions.find((p) => p.match_id === match.id);
              return (
                <div key={match.id} className="h-full">
                  <MatchCard
                    match={match}
                    userPrediction={userPred}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section className="py-16 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Chơi Vui, Bảo Mật</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Đăng nhập bằng tài khoản Google cực kỳ an toàn, tiện lợi. Dữ liệu xếp hạng cập nhật công khai minh bạch.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Tính Điểm Tự Động</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tỉ số thực tế được cập nhật trực tiếp qua API. Điểm số dự đoán tự động cộng ngay khi trận đấu kết thúc.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-3">
              <div className="inline-flex p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Xếp Hạng Thời Gian Thực</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Theo dõi sát sao thứ hạng của bạn trong nhóm. Vinh danh top 3 thủ khoa tiên tri ở bảng xếp hạng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 py-8 text-center text-xs text-muted-foreground bg-background">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
