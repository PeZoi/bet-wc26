import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import LeaderboardTable from '@/components/leaderboard-table';
import { Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  let profiles: Profile[] = [];
  let currentUserId: string | undefined = undefined;

  try {
    const supabase = await createClient();
    
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id;

    // Fetch ranked profiles
    const { data: dbProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .order('exact_scores_count', { ascending: false })
      .order('correct_outcomes_count', { ascending: false });

    if (!error && dbProfiles) {
      profiles = dbProfiles;
    }
  } catch {
    console.warn('Database error in LeaderboardPage, falling back to mock data');
    profiles = [
      { id: '1', display_name: 'Minh Hoàng', points: 12, exact_scores_count: 3, correct_outcomes_count: 3, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=hoang' },
      { id: '2', display_name: 'Thanh Thảo', points: 9, exact_scores_count: 2, correct_outcomes_count: 3, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=thao' },
      { id: '3', display_name: 'Duy Khánh', points: 7, exact_scores_count: 1, correct_outcomes_count: 4, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=khanh' },
      { id: '4', display_name: 'Anh Tuấn', points: 6, exact_scores_count: 1, correct_outcomes_count: 3, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tuan' },
      { id: '5', display_name: 'Lan Anh', points: 4, exact_scores_count: 0, correct_outcomes_count: 4, avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=lan' }
    ] as Profile[];
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Bảng Xếp Hạng
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bảng vàng vinh danh các nhà tiên tri đỉnh cao trong nhóm của bạn.
            </p>
          </div>

          <LeaderboardTable
            profiles={profiles}
            currentUserId={currentUserId}
          />
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
