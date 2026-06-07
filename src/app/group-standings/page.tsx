import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/navbar';
import { autoSyncThrottled } from '@/lib/sync';
import { Match } from '@/types';
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

  try {
    // Automatically trigger throttled sync (max once per 10 minutes)
    await autoSyncThrottled();

    const supabase = await createClient();
    
    // Fetch all matches to compute standings
    const { data: dbMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .order('match_time', { ascending: true });

    const matches: Match[] = matchesError || !dbMatches ? [] : dbMatches;

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div
                  key={group.groupLetter}
                  className="glass-panel overflow-hidden rounded-2xl border border-white/5 bg-card/25 shadow-lg flex flex-col"
                >
                  {/* Group header */}
                  <div className="bg-gradient-to-r from-primary/10 to-transparent px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white tracking-wide">
                      BẢNG {group.groupLetter}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-bold uppercase">
                      World Cup 2026
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-muted-foreground/60 font-semibold">
                          <th className="py-2.5 px-3 text-center w-8">#</th>
                          <th className="py-2.5 px-2">Đội</th>
                          <th className="py-2.5 px-2 text-center w-10" title="Trận đã đấu">Tr</th>
                          <th className="py-2.5 px-2 text-center w-16" title="Thắng - Hòa - Thua">T-H-B</th>
                          <th className="py-2.5 px-2 text-center w-12" title="Hiệu số bàn thắng">HS</th>
                          <th className="py-2.5 px-3 text-center w-10 font-bold text-foreground">Điểm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.teams.map((team, idx) => {
                          const rank = idx + 1;
                          
                          // Determine rank color class
                          let rankCircleClass = 'bg-white/5 text-muted-foreground';
                          let rowBorderClass = 'border-l-2 border-transparent';
                          let textClass = 'text-muted-foreground/80';

                          if (rank <= 2) {
                            rankCircleClass = 'bg-emerald-500/10 text-emerald-400 font-bold';
                            rowBorderClass = 'border-l-2 border-emerald-500';
                            textClass = 'text-white font-medium';
                          } else if (rank === 3) {
                            rankCircleClass = 'bg-blue-500/10 text-blue-400 font-bold';
                            rowBorderClass = 'border-l-2 border-blue-500';
                            textClass = 'text-white/90';
                          } else {
                            rankCircleClass = 'bg-red-500/5 text-red-500/50';
                            rowBorderClass = 'border-l-2 border-red-500/20';
                            textClass = 'text-muted-foreground/45';
                          }

                          return (
                            <tr
                              key={team.teamName}
                              className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${rowBorderClass}`}
                            >
                              {/* Rank */}
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${rankCircleClass}`}>
                                  {rank}
                                </span>
                              </td>

                              {/* Team Name + Flag */}
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-3.5 flex-shrink-0 overflow-hidden rounded shadow-sm border border-white/10 bg-white/5">
                                    {team.logo ? (
                                      <img
                                        src={team.logo}
                                        alt={team.teamName}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <Globe className="w-3.5 h-3.5 text-muted-foreground/50" />
                                    )}
                                  </div>
                                  <span className={`truncate max-w-[90px] sm:max-w-[120px] ${textClass}`}>
                                    {team.teamName}
                                  </span>
                                </div>
                              </td>

                              {/* Played */}
                              <td className="py-3 px-2 text-center text-muted-foreground/90 font-medium">
                                {team.played}
                              </td>

                              {/* Won-Drawn-Lost */}
                              <td className="py-3 px-2 text-center text-muted-foreground/60 font-mono">
                                {team.won}-{team.drawn}-{team.lost}
                              </td>

                              {/* GD */}
                              <td className={`py-3 px-2 text-center font-semibold font-mono ${
                                team.gd > 0 ? 'text-emerald-500' : team.gd < 0 ? 'text-rose-500/70' : 'text-muted-foreground/60'
                              }`}>
                                {team.gd > 0 ? `+${team.gd}` : team.gd}
                              </td>

                              {/* Points */}
                              <td className="py-3 px-3 text-center font-bold text-white text-sm bg-white/[0.01]">
                                {team.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
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
