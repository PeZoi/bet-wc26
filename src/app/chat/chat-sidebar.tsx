'use client';

import React, { useState } from 'react';
import { Search, Users, MessageSquare, AlertCircle } from 'lucide-react';

interface ChatSidebarProps {
  friendships: any[];
  selectedFriendId: string | null;
  onSelectFriend: (friend: any) => void;
  onRefreshFriendships: () => void;
  currentUserId: string;
}

export default function ChatSidebar({
  friendships,
  selectedFriendId,
  onSelectFriend,
  onRefreshFriendships,
  currentUserId
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc trực tiếp những người chơi từ danh sách (ở server trả về hết profiles giả lập status accepted)
  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  
  const filteredFriends = acceptedFriends.filter(f => 
    f.friend.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 border-r border-white/5 bg-[#12141c]/40 flex flex-col h-full overflow-hidden">
      
      {/* Tìm kiếm người chơi */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Search className="h-4 w-4 text-primary" />
          Tìm kiếm thành viên
        </h3>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Nhập tên người chơi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={14} />
          </span>
        </div>
      </div>

      {/* Danh sách Tất cả Thành viên trong hệ thống */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-400" />
            Danh sách người chơi ({filteredFriends.length})
          </h4>
          {friendships.length > 0 && friendships[0].friend.points !== undefined && (
            <span className="text-[9px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded font-semibold">
              Xếp theo điểm
            </span>
          )}
        </div>

        {filteredFriends.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-white/10" />
            <span className="text-xs">Không tìm thấy thành viên nào.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredFriends.map((friendship) => {
              const f = friendship.friend;
              const isSelected = selectedFriendId === f.id;
              
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFriend(f)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer border ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30 text-white shadow-sm shadow-primary/5'
                      : 'bg-white/[0.01] hover:bg-white/5 border-transparent text-muted-foreground hover:text-white'
                  }`}
                >
                  <img
                    src={f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(f.display_name)}`}
                    alt={f.display_name}
                    className="h-8 w-8 rounded-full object-cover bg-white/5 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(f.display_name)}`;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-sm text-white truncate leading-snug">{f.display_name}</span>
                      {f.points !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0">{f.points}đ</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <MessageSquare size={10} />
                      Nhấp để trò chuyện & tạo kèo
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
