'use client';

import React, { useState, useEffect } from 'react';
import { getFriendships } from '@/app/actions/chat';
import ChatSidebar from './chat-sidebar';
import ChatWindow from './chat-window';
import Navbar from '@/components/navbar';
import { MessageSquare, ShieldAlert } from 'lucide-react';

interface ChatClientProps {
  initialFriendships: any[];
  currentUserId: string;
  isLoggedIn: boolean;
}

export default function ChatClient({
  initialFriendships,
  currentUserId,
  isLoggedIn
}: ChatClientProps) {
  const [friendships, setFriendships] = useState<any[]>(initialFriendships);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm refresh danh sách bạn bè
  const refreshFriendships = async () => {
    setIsLoading(true);
    try {
      const res = await getFriendships();
      if (res.success && res.friendships) {
        setFriendships(res.friendships);
      }
    } catch (e) {
      console.error('Lỗi khi tải lại danh sách bạn bè:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Tự động làm mới danh sách bạn bè mỗi 30 giây để cập nhật lời mời kết bạn mới
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(refreshFriendships, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Chức năng yêu cầu đăng nhập</h2>
            <p className="text-sm text-muted-foreground max-w-[45ch]">
              Vui lòng đăng nhập bằng tài khoản Google để có thể chat riêng tư và tạo kèo thách đấu với bạn bè.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 glass-panel border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row bg-[#12141c]/25 backdrop-blur-md min-h-0">
          
          {/* Cột Trái: Sidebar (Ẩn trên mobile khi đã chọn bạn trò chuyện) */}
          <div className={`${selectedFriend ? 'hidden md:block' : 'block w-full md:w-auto h-full'}`}>
            <ChatSidebar
              friendships={friendships}
              selectedFriendId={selectedFriend?.id || null}
              onSelectFriend={setSelectedFriend}
              onRefreshFriendships={refreshFriendships}
              currentUserId={currentUserId}
            />
          </div>

          {/* Cột Phải: Khung Chat (Ẩn trên mobile khi chưa chọn bạn trò chuyện) */}
          <div className={`flex-1 flex flex-col h-full min-h-0 ${!selectedFriend ? 'hidden md:flex' : 'flex'}`}>
            {selectedFriend ? (
              <ChatWindow
                friend={selectedFriend}
                currentUserId={currentUserId}
                onBack={() => setSelectedFriend(null)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-[#0c0d14]/10">
                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white/20" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-white">Chưa chọn cuộc trò chuyện</h4>
                  <p className="text-xs text-muted-foreground max-w-[30ch]">
                    Chọn một người bạn từ danh sách bên trái hoặc kết bạn mới để bắt đầu chat và tạo kèo thách đấu.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
