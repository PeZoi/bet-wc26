import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import { autoSyncThrottled } from '@/lib/sync';
import GroupStandingsClient from './group-standings-client';
import { Match, Prediction } from '@/types';
import { Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TeamStanding {
  teamName: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface GroupStanding {
  groupLetter: string;
  teams: TeamStanding[];
}

export default async function GroupStandingsPage() {
  let groups: GroupStanding[] = [];
  let matches: Match[] = [];
  let predictions: Prediction[] = [];
  let isLoggedIn = false;
  let isAdmin = false;

  try {
    // Automatically trigger throttled sync (max once per 10 minutes)
    await autoSyncThrottled();

    const supabase = await createClient();

    // Fetch auth status & role
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user;
    if (user) {
      const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
      const adminEmails = adminEmailsEnv.split(',').map((email) => email.trim().toLowerCase());
      isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

      // Fetch user predictions
      const { data: dbPredictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);
      predictions = dbPredictions || [];
    }
    
    // Fetch all matches to compute standings
    const { data: dbMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true });

    matches = matchesError || !dbMatches ? [] : dbMatches;

    const standingsMap = new Map<string, Map<string, TeamStanding>>();

    // Helper to initialize team standing
    const getOrCreateStanding = (groupLetter: string, teamName: string, logo: string): TeamStanding => {
      if (!standingsMap.has(groupLetter)) {
        standingsMap.set(groupLetter, new Map<string, TeamStanding>());
      }
      const groupMap = standingsMap.get(groupLetter)!;
      if (!groupMap.has(teamName)) {
        groupMap.set(teamName, {
          teamName,
          logo: logo || '',
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          points: 0,
        });
      }
      return groupMap.get(teamName)!;
    };

    // Calculate standings from group stage matches
    matches.forEach((m) => {
      let groupLetter = '';
      if (m.stage.startsWith('Bảng ')) {
        groupLetter = m.stage.replace('Bảng ', '').trim();
      } else if (m.stage.startsWith('Group ')) {
        groupLetter = m.stage.replace('Group ', '').trim();
      } else {
        return; // Skip if it's not a group stage match
      }

      // Skip placeholders
      const skipList = ['tbd', 'runner-up', 'winner', '3rd', 'loser', 'thắng trận', 'thua trận', 'nhất bảng', 'nhì bảng', 'hạng ba'];
      const isHomePlaceholder = skipList.some((s) => m.home_team.toLowerCase().includes(s));
      const isAwayPlaceholder = skipList.some((s) => m.away_team.toLowerCase().includes(s));

      if (isHomePlaceholder || isAwayPlaceholder || !m.home_team || !m.away_team) {
        return;
      }

      const homeStanding = getOrCreateStanding(groupLetter, m.home_team, m.home_logo || '');
      const awayStanding = getOrCreateStanding(groupLetter, m.away_team, m.away_logo || '');

      if (m.status === 'FT') {
        const hs = m.home_score ?? 0;
        const as = m.away_score ?? 0;

        homeStanding.played += 1;
        awayStanding.played += 1;

        homeStanding.gf += hs;
        homeStanding.ga += as;
        homeStanding.gd = homeStanding.gf - homeStanding.ga;

        awayStanding.gf += as;
        awayStanding.ga += hs;
        awayStanding.gd = awayStanding.gf - awayStanding.ga;

        if (hs > as) {
          homeStanding.won += 1;
          homeStanding.points += 3;
          awayStanding.lost += 1;
        } else if (hs < as) {
          awayStanding.won += 1;
          awayStanding.points += 3;
          homeStanding.lost += 1;
        } else {
          homeStanding.drawn += 1;
          homeStanding.points += 1;
          awayStanding.drawn += 1;
          awayStanding.points += 1;
        }
      }
    });

    // Convert map to sorted arrays
    groups = Array.from(standingsMap.entries()).map(([groupLetter, teamsMap]) => {
      const teams = Array.from(teamsMap.values()).sort((a, b) => {
        // Sort by Points desc
        if (a.points !== b.points) return b.points - a.points;
        // Sort by Goal Difference desc
        if (a.gd !== b.gd) return b.gd - a.gd;
        // Sort by Goals For desc
        if (a.gf !== b.gf) return b.gf - a.gf;
        // Sort by Name asc
        return a.teamName.localeCompare(b.teamName);
      });

      return {
        groupLetter,
        teams,
      };
    }).sort((a, b) => a.groupLetter.localeCompare(b.groupLetter));

  } catch (error) {
    console.warn('Database error in GroupStandingsPage:', error);
    groups = [];
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Bảng Xếp Hạng Vòng Bảng
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Thứ tự và điểm số chi tiết của 12 bảng đấu (A - L) tại FIFA World Cup 2026.
            </p>
          </div>

          {/* Explanation Badges */}
          <div className="flex flex-wrap gap-4 text-xs bg-card/20 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Vị trí 1 & 2: Vé vào thẳng Vòng 1/32</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Vị trí 3: Cơ hội xét 8 đội hạng ba tốt nhất</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <span className="text-muted-foreground">Vị trí 4: Loại</span>
            </div>
          </div>

          {/* Grid of groups */}
          {groups.length > 0 ? (
            <GroupStandingsClient 
              initialGroups={groups} 
              allMatches={matches} 
              predictions={predictions}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card/10 border border-white/5 rounded-2xl backdrop-blur-sm">
              <Globe className="h-10 w-10 text-muted-foreground/35 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-muted-foreground">Không có dữ liệu bảng đấu</h3>
              <p className="text-xs text-muted-foreground/60 mt-1">Đang chờ đồng bộ lịch thi đấu...</p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground mt-8">
        <p>© 2026 WC Prediction. Vận hành bởi đam mê bóng đá.</p>
      </footer>
    </div>
  );
}
