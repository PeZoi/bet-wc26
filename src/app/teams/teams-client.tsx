'use client';

import React, { useState } from 'react';
import { Search, Globe, Users, Trophy } from 'lucide-react';
import { translateTeamName } from '@/lib/translator';
import TeamName from '@/components/team-name';

export interface Team {
  name: string;
  logo: string;
  group: string;
}

interface TeamsClientProps {
  initialTeams: Team[];
}

export default function TeamsClient({ initialTeams }: TeamsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<'All' | string>('All');

  // Groups list from A to L
  const groupsList = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Filter teams based on search & selected group
  const filteredTeams = initialTeams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translateTeamName(team.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.group.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'All' || team.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      {/* Controls: Search & Group selection */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card/30 border border-white/5 p-4 rounded-2xl backdrop-blur-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm tên quốc gia, bảng đấu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Group Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {groupsList.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`text-xs font-bold py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                selectedGroup === group
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-white/5 hover:text-foreground hover:bg-white/5'
              }`}
            >
              {group === 'All' ? 'Tất cả' : `Bảng ${group}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid count stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>Hiển thị: <strong>{filteredTeams.length}</strong> / {initialTeams.length} quốc gia</span>
        </div>
        <div>
          <span>World Cup 2026 • 48 Đội tuyển</span>
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredTeams.map((team) => (
            <div
              key={team.name}
              className="group relative flex flex-col items-center justify-center p-5 bg-card/45 hover:bg-card border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 text-center overflow-hidden"
            >
              {/* Backlight glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
              
              {/* Flag image */}
              <div className="relative mb-3.5 w-16 h-11 flex items-center justify-center overflow-hidden rounded-lg shadow-md border border-white/10 group-hover:scale-110 transition-transform duration-300 bg-white/5">
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={`${team.name} Flag`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Globe className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Team Name */}
              <TeamName 
                name={team.name} 
                className="font-bold text-sm text-white group-hover:text-primary transition-colors max-w-full justify-center px-1" 
              />

              {/* Group badge */}
              <span className="mt-2.5 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-white/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all uppercase border border-white/5 group-hover:border-primary/20">
                {team.group === 'Khác' ? 'Knockout' : `Bảng ${team.group}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card/10 border border-white/5 rounded-2xl backdrop-blur-sm">
          <Trophy className="h-10 w-10 text-muted-foreground/35 mb-3 animate-pulse" />
          <h3 className="text-base font-bold text-muted-foreground">Không tìm thấy đội bóng nào</h3>
          <p className="text-xs text-muted-foreground/60 mt-1">Vui lòng thử tìm kiếm bằng từ khóa khác</p>
        </div>
      )}
    </div>
  );
}
