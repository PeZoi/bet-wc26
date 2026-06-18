'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trophy, ArrowLeft, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendPrivateMessage, getChatMessages } from '@/app/actions/chat';
import ChallengeCard from './challenge-card';
import CreateBetModal from './create-bet-modal';
import { useDialog } from '@/components/ui/dialog-custom';
import UserAvatar from '@/components/user-avatar';

interface ChatWindowProps {
  friend: any;
  currentUserId: string;
  onBack?: () => void;
}

export default function ChatWindow({ friend, currentUserId, onBack }: ChatWindowProps) {
  const { showAlert } = useDialog();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const sendingRef = useRef(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Tải tin nhắn cũ & Thiết lập Realtime
  useEffect(() => {
    if (!friend?.id) return;

    // Load tin nhắn lịch sử
    const loadMessages = async () => {
      const res = await getChatMessages(friend.id);
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
    };
    loadMessages();

    // Subscribe Realtime lắng nghe tin nhắn mới
    const channel = supabase
      .channel(`chat_room_${friend.id}_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        (payload: any) => {
          const newMessage = payload.new;
          // Chỉ thêm tin nhắn nếu nó thuộc về cuộc trò chuyện hiện tại
          const isBelongToChat =
            (newMessage.sender_id === currentUserId && newMessage.receiver_id === friend.id) ||
            (newMessage.sender_id === friend.id && newMessage.receiver_id === currentUserId);

          if (isBelongToChat) {
            setMessages((prev) => {
              // Tránh trùng lặp tin nhắn thật từ DB
              if (prev.some(m => m.id === newMessage.id)) return prev;

              // Lọc bỏ tin nhắn tạm (optimistic) tương ứng nếu do mình gửi (có thời gian tạo lệch dưới 15 giây)
              let updated = prev;
              if (newMessage.sender_id === currentUserId) {
                const idx = prev.findIndex(m => 
                  m.isOptimistic && 
                  m.content === newMessage.content &&
                  Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 15000
                );
                if (idx !== -1) {
                  updated = prev.filter((_, i) => i !== idx);
                }
              }

              return [...updated, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend?.id, currentUserId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || sendingRef.current) return;

    const content = inputValue;
    setInputValue('');
    sendingRef.current = true;
    setIsSending(true);

    // Tạo tin nhắn giả lập hiển thị tức thời (Optimistic Message)
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: friend.id,
      content: content,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    // Đẩy ngay vào state để hiển thị ngay lập tức
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await sendPrivateMessage(friend.id, content);
      if (!res.success) {
        await showAlert(res.message || 'Không thể gửi tin nhắn.', { type: 'error' });
        // Xóa tin nhắn tạm nếu gửi thất bại
        setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
        setInputValue(content); // Trả lại chữ vào ô nhập
      }
    } catch (e: any) {
      await showAlert(e.message, { type: 'error' });
      setMessages((prev) => prev.filter(m => m.id !== optimisticMessage.id));
      setInputValue(content);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  // Hàm helper để kiểm tra xem tin nhắn có chứa mã kèo không và parse nó
  const renderMessageContent = (message: any) => {
    const betIdRegex = /\[Mã Kèo:\s*([a-f0-9-]{36})\]/;
    const match = message.content.match(betIdRegex);

    if (match) {
      const betId = match[1];
      // Loại bỏ phần text Mã Kèo đi, hiển thị thông báo đẹp và render ChallengeCard
      const cleanText = message.content.replace(betIdRegex, '').trim();
      
      return (
        <div className="space-y-2 max-w-full">
          {cleanText && <p className="whitespace-pre-line text-sm break-words">{cleanText}</p>}
          <ChallengeCard betId={betId} currentUserId={currentUserId} />
        </div>
      );
    }

    return (
      <p className="whitespace-pre-line text-sm break-words">
        {message.content}
      </p>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0c0d14]/20 overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-[#12141c]/40 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden text-muted-foreground hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          
          <UserAvatar
            src={friend.avatar_url}
            displayName={friend.display_name}
            className="h-8 w-8"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate leading-snug">{friend.display_name}</h3>
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Nút Tạo Kèo */}
        <button
          onClick={() => setIsBetModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/25 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm shadow-yellow-500/5 active:scale-95"
        >
          <Trophy size={14} />
          Tạo kèo cá nhân
        </button>
      </div>

      {/* Tin nhắn Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(() => {
          // Lọc danh sách tin nhắn hiển thị thực tế để tránh trùng lặp giữa tin tạm và tin thật (lệch thời gian dưới 15 giây)
          const displayMessages = messages.filter((msg) => {
            if (!msg.isOptimistic) return true;
            const hasRealEquivalent = messages.some(
              m => !m.isOptimistic && 
                   m.sender_id === msg.sender_id && 
                   m.content === msg.content &&
                   Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 15000
            );
            return !hasRealEquivalent;
          });

          if (displayMessages.length === 0) {
            return (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageSquare className="h-10 w-10 text-white/5" />
                <span className="text-xs">Chưa có tin nhắn. Bắt đầu câu chuyện ngay!</span>
              </div>
            );
          }

          return displayMessages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-white/5 border border-white/5 text-white rounded-tl-none'
                  }`}
                >
                  {renderMessageContent(msg)}
                  <span className="block text-[8px] text-right mt-1.5 opacity-60 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input gửi tin nhắn */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-[#12141c]/40 flex gap-2">
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-background/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Modal Tạo Kèo Custom */}
      <CreateBetModal
        isOpen={isBetModalOpen}
        onClose={() => setIsBetModalOpen(false)}
        friendId={friend.id}
        friendName={friend.display_name}
      />

    </div>
  );
}
