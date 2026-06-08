import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getFriendships } from '@/app/actions/chat';
import ChatClient from './chat-client';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  let initialFriendships: any[] = [];
  let currentUserId = '';
  let isLoggedIn = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      currentUserId = user.id;

      // Lấy danh sách friendships ban đầu phía Server-side
      const res = await getFriendships();
      if (res.success && res.friendships) {
        initialFriendships = res.friendships;
      }
    }
  } catch (error) {
    console.error('Lỗi khi khởi tạo dữ liệu trang Chat:', error);
  }

  return (
    <ChatClient
      initialFriendships={initialFriendships}
      currentUserId={currentUserId}
      isLoggedIn={isLoggedIn}
    />
  );
}
