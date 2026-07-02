'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { recalculateAllPendingPoints } from '@/lib/points';

/**
 * Submit or update a user's prediction for a match.
 */
export async function submitPrediction(
  matchId: number,
  predictionChoice: 'home' | 'away' | 'draw'
) {
  try {
    const supabase = await createClient();

    // Check session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: 'Bạn cần đăng nhập để dự đoán.' };
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
          prediction_choice: predictionChoice,
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
 * Cancel a user's prediction for a match.
 */
export async function cancelPrediction(matchId: number) {
  try {
    const supabase = await createClient();

    // Check session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: 'Bạn cần đăng nhập để hủy dự đoán.' };
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
        message: 'Trận đấu đã bắt đầu hoặc thời gian dự đoán đã khóa (không thể hủy cược).'
      };
    }

    // Delete prediction
    const { error: deleteError } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', user.id)
      .eq('match_id', matchId);

    if (deleteError) {
      console.error('Prediction delete error:', deleteError);
      return { success: false, message: 'Không thể hủy dự đoán: ' + deleteError.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/matches');
    return { success: true, message: 'Hủy dự đoán thành công!' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi hệ thống';
    console.error('cancelPrediction action error:', error);
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
  status: 'NS' | 'LIVE' | 'FT',
  handicapTeam: 'home' | 'away' | 'none',
  handicapValue: number,
  lossPoints: number = 0,
  applyScope: 'match' | 'stage' | 'group_stage' = 'match',
  drawPoints: number = 0,
  homeScore90: number | null = null,
  awayScore90: number | null = null,
  homePenaltyScore: number | null = null,
  awayPenaltyScore: number | null = null
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

    // Check if match is already finished to prevent updates
    const { data: match, error: fetchError } = await adminSupabase
      .from('matches')
      .select('status, stage')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      return { success: false, message: 'Không tìm thấy trận đấu.' };
    }

    // Áp dụng điểm thua cho toàn bộ trận đấu cùng vòng (stage)
    if (applyScope === 'stage' && match.stage) {
      const { error: stageUpdateError } = await adminSupabase
        .from('matches')
        .update({
          loss_points: lossPoints,
          draw_points: drawPoints,
          updated_at: new Date().toISOString()
        })
        .eq('stage', match.stage);

      if (stageUpdateError) {
        console.error('Lỗi cập nhật loss_points/draw_points theo stage:', stageUpdateError);
      }
    }
    // Áp dụng điểm thua cho toàn bộ các trận Vòng bảng (Group Stage)
    else if (applyScope === 'group_stage') {
      const { error: groupUpdateError } = await adminSupabase
        .from('matches')
        .update({
          loss_points: lossPoints,
          draw_points: drawPoints,
          updated_at: new Date().toISOString()
        })
        .like('stage', 'Bảng %');

      if (groupUpdateError) {
        console.error('Lỗi cập nhật loss_points/draw_points cho toàn bộ Vòng bảng:', groupUpdateError);
      }
    }

    const { error: updateError } = await adminSupabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        home_score_90: homeScore90,
        away_score_90: awayScore90,
        home_penalty_score: homePenaltyScore,
        away_penalty_score: awayPenaltyScore,
        status: status,
        handicap_team: handicapTeam,
        handicap_value: handicapValue,
        loss_points: lossPoints,
        draw_points: drawPoints,
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
    return { success: true, message: 'Cập nhật trận đấu thành công!' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi hệ thống';
    console.error('updateMatchScoreAdmin action error:', error);
    return { success: false, message };
  }
}
