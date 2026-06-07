import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import DashboardClient from './dashboard-client';
import { autoSyncThrottled } from '@/lib/sync';
import { Match, Prediction, Profile } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userProfile: Profile | null = null;
  let matches: Match[] = [];
  let predictions: Prediction[] = [];
  let leaderboard: Profile[] = [];
  let userRank = '-';
  let isLoggedIn = false;

  try {
    // Automatically trigger throttled sync (max once per 10 minutes)
    await autoSyncThrottled();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      userProfile = profile;

      // Fetch user predictions
      const { data: userPreds } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);
      
      predictions = userPreds || [];
    }

    // Fetch matches
    const { data: dbMatches } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true });

    matches = dbMatches || [];

    // Fetch ranked profiles for ranking & leaderboard widget
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .order('exact_scores_count', { ascending: false });

    leaderboard = dbProfiles || [];

    if (user && leaderboard.length > 0) {
      const idx = leaderboard.findIndex((p: Profile) => p.id === user.id);
      if (idx !== -1) {
        userRank = (idx + 1).toString();
      }
    }
  } catch (error) {
    console.error('Database connection failed in Dashboard:', error);
    matches = [];
    userProfile = null;
    predictions = [];
    leaderboard = [];
    userRank = '-';
    isLoggedIn = false;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardClient
          userProfile={userProfile}
          userRank={userRank}
          matches={matches}
          predictions={predictions}
          leaderboard={leaderboard}
          isLoggedIn={isLoggedIn}
        />
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
