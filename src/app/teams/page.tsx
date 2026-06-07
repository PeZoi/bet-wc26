import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import { autoSyncThrottled } from '@/lib/sync';
import TeamsClient, { Team } from './teams-client';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  let teams: Team[] = [];

  try {
    // Automatically trigger throttled sync (max once per 10 minutes)
    await autoSyncThrottled();

    const supabase = await createClient();
    
    // Fetch all matches to extract teams dynamically
    const { data: dbMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true });

    const matches = matchesError || !dbMatches ? [] : dbMatches;

    const teamsMap = new Map<string, Team>();

    matches.forEach((m) => {
      const isGroupStage = m.stage.startsWith('Bảng ');
      const groupLetter = isGroupStage ? m.stage.replace('Bảng ', '').trim() : 'Khác';

      // Skip placeholders like TBD / Winner / Runner-up / 3rd
      const skipList = ['tbd', 'runner-up', 'winner', '3rd', 'loser', 'thắng trận', 'thua trận', 'nhất bảng', 'nhì bảng', 'hạng ba'];

      const isHomePlaceholder = skipList.some((s) => m.home_team.toLowerCase().includes(s));
      if (!isHomePlaceholder && m.home_team) {
        const existing = teamsMap.get(m.home_team);
        if (!existing || (existing.group === 'Khác' && groupLetter !== 'Khác')) {
          teamsMap.set(m.home_team, {
            name: m.home_team,
            logo: m.home_logo || '',
            group: groupLetter,
          });
        }
      }

      const isAwayPlaceholder = skipList.some((s) => m.away_team.toLowerCase().includes(s));
      if (!isAwayPlaceholder && m.away_team) {
        const existing = teamsMap.get(m.away_team);
        if (!existing || (existing.group === 'Khác' && groupLetter !== 'Khác')) {
          teamsMap.set(m.away_team, {
            name: m.away_team,
            logo: m.away_logo || '',
            group: groupLetter,
          });
        }
      }
    });

    teams = Array.from(teamsMap.values()).sort((a, b) => {
      if (a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }
      return a.name.localeCompare(b.name);
    });

  } catch (error) {
    console.warn('Database error in TeamsPage:', error);
    teams = [];
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Đội Tuyển Tham Dự
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Danh sách 48 đội tuyển tham gia tranh tài tại vòng chung kết FIFA World Cup 2026.
            </p>
          </div>

          <TeamsClient initialTeams={teams} />
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
