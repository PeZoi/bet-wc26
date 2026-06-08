'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { recalculateAllPendingPoints } from '@/lib/points';

/**
 * Submit or update a user's prediction for a match.
 */
export async function submitPrediction(
  matchId: number,
  homeScore: number,
  awayScore: number
) {
  try {
    const supabase = await createClient();

    // Check session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: 'Bạn cần đăng nhập để dự đoán tỉ số.' };
    }

    // Fetch match details to verify time lock
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('match_time, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return { success: false, message: 'Không tìm thấy trận đấu.' };
    }

    // Lock predictions 5 minutes before match start
    const matchTime = new Date(match.match_time).getTime();
    const now = Date.now();
    const lockTime = matchTime - 5 * 60 * 1000; // 5 minutes before kickoff

    if (now > lockTime || match.status !== 'NS') {
      return {
        success: false,
        message: 'Trận đấu đã bắt đầu hoặc thời gian dự đoán đã khóa (5 phút trước giờ bóng lăn).'
      };
    }

    // Upsert prediction
    const { error: upsertError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          predicted_home_score: homeScore,
          predicted_away_score: awayScore,
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id,match_id' }
      );

    if (upsertError) {
      console.error('Prediction upsert error:', upsertError);
      return { success: false, message: 'Không thể lưu dự đoán: ' + upsertError.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/matches');
    return { success: true, message: 'Lưu dự đoán thành công!' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi hệ thống';
    console.error('submitPrediction action error:', error);
    return { success: false, message };
  }
}

/**
 * Update a match score manually (Admin only).
 */
export async function updateMatchScoreAdmin(
  matchId: number,
  homeScore: number,
  awayScore: number,
  status: 'NS' | 'LIVE' | 'FT'
) {
  try {
    const supabase = await createClient();

    // Check user and verify admin permission
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: 'Bạn không có quyền thực hiện hành động này.' };
    }

    // Verify user email against admin emails in environment variables
    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((email) => email.trim().toLowerCase());
    
    if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
      return { success: false, message: 'Tài khoản của bạn không được phân quyền Admin.' };
    }

    // Use admin client to bypass RLS for match updates
    const adminSupabase = createAdminClient();

    const { error: updateError } = await adminSupabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('Admin match update error:', updateError);
      return { success: false, message: 'Lỗi cập nhật trận đấu: ' + updateError.message };
    }

    // Tự động tính điểm và cập nhật bảng xếp hạng nếu trận đấu kết thúc
    if (status === 'FT') {
      const calcResult = await recalculateAllPendingPoints();
      if (!calcResult.success) {
        console.error('Lỗi tự động tính điểm:', calcResult.message);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/matches');
    revalidatePath('/leaderboard');
    return { success: true, message: 'Cập nhật tỉ số trận đấu thành công!' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi hệ thống';
    console.error('updateMatchScoreAdmin action error:', error);
    return { success: false, message };
  }
}
