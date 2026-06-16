'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Check, X, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { respondToCustomBet, resolveCustomBet } from '@/app/actions/chat';
import { useDialog } from '@/components/ui/dialog-custom';

interface ChallengeCardProps {
  betId: string;
  currentUserId: string;
}

export default function ChallengeCard({ betId, currentUserId }: ChallengeCardProps) {
  const { showAlert, showConfirm } = useDialog();
  const [bet, setBet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // 1. Fetch thông tin kèo ban đầu
    const fetchBet = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_bets')
          .select(`
            *,
            creator:profiles!custom_bets_creator_id_fkey(display_name),
            challenger:profiles!custom_bets_challenger_id_fkey(display_name),
            match:matches(*)
          `)
          .eq('id', betId)
          .single();

        if (error) throw error;
        setBet(data);
      } catch (error) {
        console.error('Lỗi khi tải thông tin kèo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBet();

    // 2. Lắng nghe thay đổi Realtime của kèo này
    const channel = supabase
      .channel(`custom_bet_${betId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_bets',
          filter: `id=eq.${betId}`
        },
        async () => {
          // Fetch lại thông tin đầy đủ kèm theo profile
          const { data } = await supabase
            .from('custom_bets')
            .select(`
              *,
              creator:profiles!custom_bets_creator_id_fkey(display_name),
              challenger:profiles!custom_bets_challenger_id_fkey(display_name),
              match:matches(*)
            `)
            .eq('id', betId)
            .single();

          if (data) {
            setBet(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [betId, supabase]);

  if (isLoading) {
    return (
      <div className="bg-[#1b1e2b] border border-white/5 rounded-2xl p-4 flex items-center justify-center h-28">
        <div className="animate-pulse flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="h-4 w-4 animate-spin text-yellow-500" />
          Đang tải kèo thách đấu...
        </div>
      </div>
    );
  }

  if (!bet) return null;

  const isCreator = bet.creator_id === currentUserId;
  const isChallenger = bet.challenger_id === currentUserId;

  const handleRespond = async (status: 'accepted' | 'rejected') => {
    const confirmMsg = status === 'accepted'
      ? `Bạn muốn chấp nhận kèo: "${bet.title}" cược ${bet.points_wager} điểm chứ?`
      : `Bạn muốn từ chối kèo thách đấu này?`;

    const isConfirmed = await showConfirm(confirmMsg, {
      title: status === 'accepted' ? 'Chấp nhận kèo' : 'Từ chối kèo',
      type: status === 'accepted' ? 'confirm' : 'warning'
    });

    if (!isConfirmed) return;

    setIsActionLoading(true);
    try {
      const res = await respondToCustomBet(bet.id, status);
      if (!res.success) {
        await showAlert(res.message, { type: 'error' });
      }
    } catch (e: any) {
      await showAlert(e.message, { type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResolve = async (outcome: 'win' | 'lose' | 'draw') => {
    let result: 'finished_creator_won' | 'finished_challenger_won' | 'finished_draw';
    let confirmText = '';

    if (outcome === 'draw') {
      result = 'finished_draw';
      confirmText = 'Bạn xác nhận hai bên HÒA kèo này?';
    } else if (outcome === 'win') {
      result = isCreator ? 'finished_creator_won' : 'finished_challenger_won';
      confirmText = 'Bạn xác nhận BẠN ĐÃ THẮNG kèo này?';
    } else {
      result = isCreator ? 'finished_challenger_won' : 'finished_creator_won';
      confirmText = 'Bạn xác nhận BẠN ĐÃ THUA kèo này?';
    }

    const isConfirmed = await showConfirm(confirmText, {
      title: 'Phân định kết quả',
      type: 'confirm'
    });

    if (!isConfirmed) return;

    setIsActionLoading(true);
    try {
      const res = await resolveCustomBet(bet.id, result);
      if (!res.success) {
        await showAlert(res.message, { type: 'error' });
      } else {
        await showAlert('Kết quả kèo đã được ghi nhận thành công!', { type: 'success' });
      }
    } catch (e: any) {
      await showAlert(e.message, { type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

    const cleanTitle = bet.title.replace(/^\[Prediction:\s*\w+\]\s*/, '');

    return (
      <div className="my-3 max-w-sm bg-[#161a29] border border-white/10 rounded-2xl shadow-xl overflow-hidden text-left text-white">
        {/* Top Banner decoration */}
        <div className={`h-1 w-full ${
          bet.status === 'pending' ? 'bg-amber-500' :
          bet.status === 'accepted' ? 'bg-sky-500' :
          bet.status.startsWith('finished') ? 'bg-emerald-500' : 'bg-gray-600'
        }`} />

        <div className="p-4 space-y-3">
          {/* Title & Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-500">
              <Trophy className="h-3.5 w-3.5" />
              <span>KÈO THÁCH ĐẤU</span>
            </div>
            
            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
              bet.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              bet.status === 'accepted' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
              bet.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {bet.status === 'pending' ? 'Chờ nhận' :
               bet.status === 'accepted' ? 'Đang đấu' :
               bet.status === 'rejected' ? 'Từ chối' : 'Hoàn thành'}
            </span>
          </div>

          {/* Bet Title & Description */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white leading-snug">{cleanTitle}</h4>
            {bet.description && (
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                🎁 Thỏa thuận: {bet.description}
              </p>
            )}
            
            {/* Cửa cược của người thách */}
            {(() => {
              const matchPred = bet.title.match(/^\[Prediction:\s*(\w+)\]/);
              if (!matchPred) return null;
              const pred = matchPred[1];
              let predText = '';
              if (pred === 'HOME_WIN') predText = `${bet.match?.home_team || 'Đội nhà'} thắng`;
              else if (pred === 'AWAY_WIN') predText = `${bet.match?.away_team || 'Đội khách'} thắng`;
              else if (pred === 'DRAW') predText = 'Hòa';
              
              return (
                <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-yellow-500 bg-yellow-950/20 border border-yellow-800/30 px-2 py-0.5 rounded-md">
                  Dự đoán: {bet.creator?.display_name || 'Người thách'} chọn [{predText}]
                </div>
              );
            })()}

            {bet.points_wager > 0 && (
              <div className="inline-flex items-center gap-1 mt-1 text-xs font-extrabold text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 px-2.5 py-0.5 rounded-full font-mono">
                Điểm cược: {bet.points_wager}đ
              </div>
            )}
          </div>

        {/* Trận đấu đính kèm (nếu có) */}
        {bet.match && (
          <div className="bg-[#1e2338]/60 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {bet.match.home_logo && (
                <img src={bet.match.home_logo} alt={bet.match.home_team} className="w-4 h-4 object-contain" />
              )}
              <span className="font-bold text-white truncate max-w-[60px] md:max-w-[80px]">{bet.match.home_team}</span>
            </div>
            
            <div className="flex flex-col items-center flex-shrink-0">
              {bet.match.status === 'NS' ? (
                <span className="text-[9px] text-muted-foreground font-semibold">
                  {new Date(bet.match.match_time).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              ) : (
                <span className="font-mono font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px]">
                  {bet.match.home_score ?? 0} - {bet.match.away_score ?? 0}
                </span>
              )}
              <span className="text-[8px] text-muted-foreground uppercase font-black mt-0.5 scale-90">
                {bet.match.status === 'NS' ? 'Chưa đá' : bet.match.status === 'LIVE' ? 'Trực tiếp' : 'Kết thúc'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
              <span className="font-bold text-white truncate max-w-[60px] md:max-w-[80px]">{bet.match.away_team}</span>
              {bet.match.away_logo && (
                <img src={bet.match.away_logo} alt={bet.match.away_team} className="w-4 h-4 object-contain" />
              )}
            </div>
          </div>
        )}

        {/* Người thách đấu */}
        <div className="text-[10px] text-muted-foreground font-semibold border-t border-white/5 pt-2 flex items-center justify-between">
          <span>Người thách: {bet.creator?.display_name || 'Đối thủ'}</span>
          <span>Đối phương: {bet.challenger?.display_name || 'Bạn'}</span>
        </div>

        {/* Nút bấm điều khiển dựa trên trạng thái */}
        <div className="border-t border-white/5 pt-3">
          
          {/* TRẠNG THÁI: PENDING (ĐANG CHỜ) */}
          {bet.status === 'pending' && (
            <div className="flex gap-2">
              {isChallenger ? (
                <>
                  <button
                    onClick={() => handleRespond('rejected')}
                    disabled={isActionLoading}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X size={14} />
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleRespond('accepted')}
                    disabled={isActionLoading}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-primary/20"
                  >
                    <Check size={14} />
                    Chấp nhận
                  </button>
                </>
              ) : (
                <div className="w-full text-center text-xs text-muted-foreground italic py-1">
                  Đang chờ {bet.challenger?.display_name} chấp nhận...
                </div>
              )}
            </div>
          )}

          {/* TRẠNG THÁI: ACCEPTED (ĐÃ CHẤP NHẬN - ĐANG ĐẤU) */}
          {bet.status === 'accepted' && (
            <div className="space-y-2">
              {bet.match ? (
                <div className="text-[10px] text-sky-400 font-bold flex items-center gap-1.5 py-1.5 bg-sky-950/10 border border-sky-900/20 px-2.5 rounded-lg">
                  <Play size={10} className="animate-pulse flex-shrink-0" />
                  <span>Kèo tự động phân định thắng thua sau khi trận đấu kết thúc.</span>
                </div>
              ) : (
                <>
                  <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                    <Play size={10} className="text-sky-400 animate-pulse" />
                    <span>Kèo đang đấu! Nhấn tự phân định sau khi trận đấu ngã ngũ:</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve('win')}
                      disabled={isActionLoading}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Tôi thắng
                    </button>
                    <button
                      onClick={() => handleResolve('draw')}
                      disabled={isActionLoading}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-muted-foreground hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Hòa
                    </button>
                    <button
                      onClick={() => handleResolve('lose')}
                      disabled={isActionLoading}
                      className="flex-1 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/20 text-[10px] font-bold text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Tôi thua
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TRẠNG THÁI: REJECTED (TỪ CHỐI KÈO) */}
          {bet.status === 'rejected' && (
            <div className="w-full text-center text-xs text-rose-400/80 font-bold flex items-center justify-center gap-1 py-1">
              <X size={14} />
              Kèo đã bị từ chối
            </div>
          )}

          {/* TRẠNG THÁI: FINISHED (KÈO HOÀN THÀNH) */}
          {bet.status.startsWith('finished') && (
            <div className="w-full p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-center">
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <Check size={14} />
                <span>Phân định: {
                  bet.status === 'finished_draw' ? 'Hòa nhau 🤝' :
                  (bet.status === 'finished_creator_won' && isCreator) || (bet.status === 'finished_challenger_won' && isChallenger)
                    ? 'Bạn đã thắng! 👑'
                    : 'Bạn đã thua! 💀'
                }</span>
              </div>
              {bet.points_wager > 0 && (
                <div className="text-[9px] text-muted-foreground font-semibold mt-1">
                  {bet.status === 'finished_draw' ? 'Trả lại điểm cược.' :
                   (bet.status === 'finished_creator_won' && isCreator) || (bet.status === 'finished_challenger_won' && isChallenger)
                     ? `Cộng ${bet.points_wager}đ vào bảng xếp hạng.`
                     : `Trừ ${bet.points_wager}đ từ bảng xếp hạng.`
                  }
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
