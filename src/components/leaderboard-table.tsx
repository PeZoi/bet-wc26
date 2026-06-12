'use client';

import React from 'react';
import { Profile } from '@/types';
import { Medal, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LeaderboardTableProps {
  profiles: Profile[];
  currentUserId?: string;
}

export default function LeaderboardTable({
  profiles,
  currentUserId
}: LeaderboardTableProps) {
  // Animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">
          <Trophy className="h-3.5 w-3.5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/20 border border-slate-300/30 text-slate-300">
          <Medal className="h-3.5 w-3.5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-600/20 border border-amber-600/30 text-amber-500">
          <Medal className="h-3.5 w-3.5" />
        </div>
      );
    }
    return <span className="font-mono text-sm font-semibold text-muted-foreground">{rank}</span>;
  };

  if (profiles.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground border border-white/5">
        Chưa có dữ liệu xếp hạng. Hãy đăng nhập và tạo dự đoán đầu tiên!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full glass-panel rounded-2xl border border-white/5">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-white/[0.01]">
            <th className="py-4 px-6 text-center w-16">Hạng</th>
            <th className="py-4 px-6">Thành viên</th>
            <th className="py-4 px-6 text-center">Thắng Kèo (+3đ)</th>
            <th className="py-4 px-6 text-center">Hòa Kèo (+1đ)</th>
            <th className="py-4 px-6 text-right font-bold text-primary">Tổng Điểm</th>
          </tr>
        </thead>
        <motion.tbody
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="divide-y divide-white/5"
        >
          {profiles.map((profile, index) => {
            const rank = index + 1;
            const isCurrentUser = profile.id === currentUserId;

            return (
              <motion.tr
                key={profile.id}
                variants={itemVariants}
                className={`transition-colors hover:bg-white/[0.02] ${
                  isCurrentUser ? 'bg-primary/5 hover:bg-primary/[0.08] font-semibold' : ''
                }`}
              >
                {/* Rank */}
                <td className="py-4 px-6 text-center">
                  <div className="flex items-center justify-center">
                    {getRankBadge(rank)}
                  </div>
                </td>

                {/* Avatar and Name */}
                <td className="py-4 px-6">
                  <Link 
                    href={`/users/${profile.id}`} 
                    prefetch={true}
                    className="flex items-center gap-3 hover:text-primary transition-colors cursor-pointer group w-max max-w-full"
                  >
                    <img
                      src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                      alt={`${profile.display_name} avatar`}
                      className={`h-9 w-9 rounded-full object-cover border transition-all group-hover:scale-105 ${
                        isCurrentUser ? 'border-primary group-hover:border-primary/80' : 'border-white/5 group-hover:border-primary/50'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profile.id;
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm truncate font-medium group-hover:underline ${isCurrentUser ? 'text-primary font-bold' : 'text-white'}`}>
                        {profile.display_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-primary/80 font-medium">Bạn</span>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Exact Scores Count */}
                <td className="py-4 px-6 text-center font-mono text-sm">
                  {profile.exact_scores_count}
                </td>

                {/* Correct Outcomes Count */}
                <td className="py-4 px-6 text-center font-mono text-sm">
                  {profile.correct_outcomes_count}
                </td>

                {/* Total Points */}
                <td className="py-4 px-6 text-right">
                  <span className="font-mono text-base font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {profile.points}đ
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </motion.tbody>
      </table>
    </div>
  );
}
