'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Tìm kiếm người dùng khác theo tên để kết bạn
 */
export async function searchUsers(query: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) throw error;
    return { success: true, profiles };
  } catch (error: any) {
    console.error('searchUsers error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Gửi yêu cầu kết bạn
 */
export async function sendFriendRequest(friendId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    // Không tự kết bạn với chính mình
    if (user.id === friendId) {
      return { success: false, message: 'Bạn không thể kết bạn với chính mình.' };
    }

    // Kiểm tra xem đã có quan hệ bạn bè chưa
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, message: 'Hai người đã là bạn bè.' };
      }
      return { success: false, message: 'Yêu cầu kết bạn đang ở trạng thái chờ hoặc đã được xử lý.' };
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });

    if (error) throw error;
    return { success: true, message: 'Gửi yêu cầu kết bạn thành công!' };
  } catch (error: any) {
    console.error('sendFriendRequest error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Phản hồi yêu cầu kết bạn (Chấp nhận / Từ chối)
 */
export async function respondToFriendRequest(friendshipId: string, status: 'accepted' | 'rejected') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    if (status === 'rejected') {
      // Xóa bản ghi nếu từ chối
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      if (error) throw error;
      return { success: true, message: 'Đã từ chối lời mời kết bạn.' };
    }

    // Chấp nhận yêu cầu kết bạn
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .eq('friend_id', user.id); // Chỉ người nhận mới được chấp nhận

    if (error) throw error;
    return { success: true, message: 'Đã chấp nhận kết bạn!' };
  } catch (error: any) {
    console.error('respondToFriendRequest error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Lấy danh sách bạn bè (bao gồm lời mời đã gửi/nhận)
 */
export async function getFriendships() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.', friendships: [] };

    // Lấy toàn bộ profiles trong hệ thống (ngoại trừ bản thân), sắp xếp theo điểm số giảm dần
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, points')
      .neq('id', user.id)
      .order('points', { ascending: false });

    if (error) throw error;

    // Giả lập định dạng giống như friendships.status = 'accepted' để tái sử dụng tối đa code client
    const formatted = profiles.map((p: any) => ({
      friendshipId: p.id,
      status: 'accepted',
      isOutgoingRequest: false,
      isIncomingRequest: false,
      friend: p
    }));

    return { success: true, friendships: formatted };
  } catch (error: any) {
    console.error('getFriendships error:', error);
    return { success: false, message: error.message, friendships: [] };
  }
}

/**
 * Gửi tin nhắn chat
 */
export async function sendPrivateMessage(receiverId: string, content: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    const { error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('sendPrivateMessage error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Lấy lịch sử chat
 */
export async function getChatMessages(friendId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.', messages: [] };

    const { data, error } = await supabase
      .from('private_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, messages: data };
  } catch (error: any) {
    console.error('getChatMessages error:', error);
    return { success: false, message: error.message, messages: [] };
  }
}

/**
 * Tạo kèo thách đấu cá nhân
 */
export async function createCustomBet(
  challengerId: string,
  title: string,
  description: string,
  pointsWager: number,
  matchId?: number
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    // Kiểm tra điểm số của người tạo nếu cược điểm số lớn hơn 0
    if (pointsWager > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      const currentPoints = profile?.points || 0;
      if (currentPoints < pointsWager) {
        return {
          success: false,
          message: `Bạn không đủ điểm để cược. Số điểm hiện tại: ${currentPoints}đ, điểm cược yêu cầu: ${pointsWager}đ.`
        };
      }
    }

    const { data: bet, error } = await supabase
      .from('custom_bets')
      .insert({
        creator_id: user.id,
        challenger_id: challengerId,
        title,
        description,
        points_wager: pointsWager,
        match_id: matchId || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Gửi tin nhắn tự động thông báo về kèo thách đấu vào cuộc hội thoại
    const messageContent = `🏆 [KÈO THÁCH ĐẤU]: "${title}"\nPhần thưởng/Hình phạt: ${description || 'Tự thỏa thuận'}\nĐiểm cược: ${pointsWager}đ.\n[Mã Kèo: ${bet.id}]`;
    await sendPrivateMessage(challengerId, messageContent);

    return { success: true, bet };
  } catch (error: any) {
    console.error('createCustomBet error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Phản hồi kèo thách đấu (Chấp nhận / Từ chối)
 */
export async function respondToCustomBet(betId: string, status: 'accepted' | 'rejected') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    // Lấy thông tin kèo thách đấu
    const { data: bet, error: getError } = await supabase
      .from('custom_bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (getError || !bet) return { success: false, message: 'Không tìm thấy kèo thách đấu.' };
    if (bet.challenger_id !== user.id) return { success: false, message: 'Bạn không phải là người được thách đấu.' };
    if (bet.status !== 'pending') return { success: false, message: 'Kèo thách đấu này đã được xử lý.' };

    // Nếu đồng ý và có điểm cược, kiểm tra xem người nhận có đủ điểm cược không
    if (status === 'accepted' && bet.points_wager > 0) {
      const { data: challengerProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();

      const challengerPoints = challengerProfile?.points || 0;
      if (challengerPoints < bet.points_wager) {
        return {
          success: false,
          message: `Bạn không đủ điểm để nhận kèo. Số điểm hiện tại: ${challengerPoints}đ, yêu cầu: ${bet.points_wager}đ.`
        };
      }
    }

    const { error: updateError } = await supabase
      .from('custom_bets')
      .update({ status })
      .eq('id', betId);

    if (updateError) throw updateError;

    // Gửi tin nhắn thông báo tự động phản hồi kèo vào cuộc hội thoại
    const responseContent = status === 'accepted'
      ? `✅ Đã chấp nhận kèo thách đấu: "${bet.title}"! Trận đấu bắt đầu!`
      : `❌ Đã từ chối kèo thách đấu: "${bet.title}".`;
    await sendPrivateMessage(bet.creator_id, responseContent);

    return { success: true, message: status === 'accepted' ? 'Đã nhận kèo thách đấu!' : 'Đã từ chối kèo.' };
  } catch (error: any) {
    console.error('respondToCustomBet error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Phân định kết quả kèo (Khi kèo ngã ngũ)
 */
export async function resolveCustomBet(
  betId: string,
  result: 'finished_creator_won' | 'finished_challenger_won' | 'finished_draw'
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.' };

    // Lấy thông tin kèo thách đấu
    const { data: bet, error: getError } = await supabase
      .from('custom_bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (getError || !bet) return { success: false, message: 'Không tìm thấy kèo.' };
    
    // Chỉ creator hoặc challenger của kèo mới được quyền cập nhật kết quả
    if (bet.creator_id !== user.id && bet.challenger_id !== user.id) {
      return { success: false, message: 'Bạn không có quyền phân định kết quả kèo này.' };
    }

    if (bet.status !== 'accepted') {
      return { success: false, message: 'Kèo chưa được nhận hoặc đã được phân định kết quả trước đó.' };
    }

    const adminSupabase = createAdminClient();

    // 1. Cập nhật trạng thái kèo thách đấu
    const { error: updateBetError } = await adminSupabase
      .from('custom_bets')
      .update({ status: result })
      .eq('id', betId);

    if (updateBetError) throw updateBetError;

    // 2. Chuyển điểm cược nếu points_wager > 0
    if (bet.points_wager > 0 && result !== 'finished_draw') {
      const points = bet.points_wager;
      const isCreatorWon = result === 'finished_creator_won';
      const winnerId = isCreatorWon ? bet.creator_id : bet.challenger_id;
      const loserId = isCreatorWon ? bet.challenger_id : bet.creator_id;

      // Lấy điểm hiện tại của người thắng và người thua
      const { data: winnerProfile } = await adminSupabase.from('profiles').select('points').eq('id', winnerId).single();
      const { data: loserProfile } = await adminSupabase.from('profiles').select('points').eq('id', loserId).single();

      const newWinnerPoints = (winnerProfile?.points || 0) + points;
      const newLoserPoints = Math.max(0, (loserProfile?.points || 0) - points); // Không để điểm số âm

      // Cập nhật điểm cho người thắng
      await adminSupabase.from('profiles').update({ points: newWinnerPoints }).eq('id', winnerId);
      // Cập nhật điểm cho người thua
      await adminSupabase.from('profiles').update({ points: newLoserPoints }).eq('id', loserId);
    }

    // 3. Gửi tin nhắn thông báo kết quả kèo tự động vào chat
    const resultText = result === 'finished_creator_won'
      ? `👑 KÈO ĐÃ PHÂN ĐỊNH: Người thách đấu (${user.id === bet.creator_id ? 'Bạn' : 'Đối thủ'}) đã THẮNG kèo "${bet.title}"!`
      : result === 'finished_challenger_won'
      ? `👑 KÈO ĐÃ PHÂN ĐỊNH: Người nhận thách đấu (${user.id === bet.challenger_id ? 'Bạn' : 'Đối thủ'}) đã THẮNG kèo "${bet.title}"!`
      : `🤝 KÈO ĐÃ PHÂN ĐỊNH: Hai bên HÒA kèo "${bet.title}"!`;

    const notificationReceiver = user.id === bet.creator_id ? bet.challenger_id : bet.creator_id;
    await sendPrivateMessage(notificationReceiver, resultText);

    revalidatePath('/leaderboard');
    revalidatePath('/dashboard');
    return { success: true, message: 'Phân định kết quả kèo thành công!' };
  } catch (error: any) {
    console.error('resolveCustomBet error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Lấy danh sách các trận đấu chưa diễn ra (status = 'NS' hoặc status = 'LIVE')
 */
export async function getUpcomingMatches() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Bạn chưa đăng nhập.', matches: [] };

    // Lấy các trận đấu có status là 'NS' (Not Started) hoặc 'LIVE'
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['NS', 'LIVE'])
      .order('match_time', { ascending: true });

    if (error) throw error;
    return { success: true, matches: data || [] };
  } catch (error: any) {
    console.error('getUpcomingMatches error:', error);
    return { success: false, message: error.message, matches: [] };
  }
}
