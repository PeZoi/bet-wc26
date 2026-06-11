import { createAdminClient } from '@/lib/supabase/server';

/**
 * Helper để cập nhật tổng điểm và số lần đoán trúng cho danh sách user_id bị ảnh hưởng.
 */
async function updateProfilesPoints(supabase: any, userIds: Set<string>): Promise<void> {
  console.log(`Cập nhật điểm cho các user bị ảnh hưởng: ${userIds.size} users`);
  
  for (const userId of userIds) {
    // Lấy tất cả dự đoán của user này đã được tính điểm
    const { data: userPreds, error: userPredsError } = await supabase
      .from('predictions')
      .select('points_earned')
      .eq('user_id', userId)
      .not('points_earned', 'is', null);

    if (userPredsError) {
      console.error(`Lỗi khi lấy điểm tích lũy của user ${userId}:`, userPredsError.message);
      continue;
    }

    const totalPoints = userPreds.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0);
    const exactCount = userPreds.filter((p: any) => p.points_earned === 3).length;
    const correctOutcomeCount = userPreds.filter((p: any) => p.points_earned === 1).length;

    // Cập nhật profile của user
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        points: totalPoints,
        exact_scores_count: exactCount,
        correct_outcomes_count: correctOutcomeCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`Lỗi khi cập nhật profile cho user ${userId}:`, profileError.message);
    }
  }
}

/**
 * Tự động phân định kết quả các kèo cá nhân gắn với trận đấu vừa kết thúc
 */
async function autoResolveCustomBets(supabase: any, matchId: number, homeScore: number, awayScore: number): Promise<void> {
  console.log(`Tự động phân định kèo cá nhân cho trận đấu ${matchId} (Tỉ số: ${homeScore}-${awayScore})`);
  
  try {
    // Lấy các kèo cá nhân đang ở trạng thái 'accepted' (đang đấu) gắn với trận đấu này
    const { data: bets, error } = await supabase
      .from('custom_bets')
      .select(`
        *,
        creator:profiles!custom_bets_creator_id_fkey(display_name),
        challenger:profiles!custom_bets_challenger_id_fkey(display_name)
      `)
      .eq('match_id', matchId)
      .eq('status', 'accepted');

    if (error) {
      console.error(`Lỗi lấy kèo cá nhân cho trận ${matchId}:`, error.message);
      return;
    }

    if (!bets || bets.length === 0) return;

    const actual = homeScore > awayScore ? 'HOME_WIN' : homeScore < awayScore ? 'AWAY_WIN' : 'DRAW';

    for (const bet of bets) {
      const matchPred = bet.title.match(/^\[Prediction:\s*(\w+)\]/);
      if (!matchPred) continue; // Bỏ qua nếu không parse được prediction

      const prediction = matchPred[1]; // HOME_WIN, AWAY_WIN, DRAW
      const isCreatorWon = prediction === actual;
      const result = isCreatorWon ? 'finished_creator_won' : 'finished_challenger_won';

      // 1. Cập nhật trạng thái kèo thách đấu
      const { error: updateError } = await supabase
        .from('custom_bets')
        .update({ status: result })
        .eq('id', bet.id);

      if (updateError) {
        console.error(`Lỗi cập nhật kết quả kèo ${bet.id}:`, updateError.message);
        continue;
      }

      // 2. Gửi tin nhắn thông báo tự động vào chat
      const cleanTitle = bet.title.replace(/^\[Prediction:\s*\w+\]\s*/, '');
      const winnerName = isCreatorWon ? (bet.creator?.display_name || 'Người thách đấu') : (bet.challenger?.display_name || 'Người nhận thách đấu');
      
      const resultText = `🤖 [TỰ ĐỘNG PHÂN ĐỊNH KÈO]: Trận đấu kết thúc với tỉ số ${homeScore}-${awayScore}.\n🏆 Người thắng: ${winnerName}!\nKèo: "${cleanTitle}"\nPhần thưởng: ${bet.description || 'Tự thỏa thuận'}`;

      const { error: msgError } = await supabase
        .from('private_messages')
        .insert({
          sender_id: bet.creator_id,
          receiver_id: bet.challenger_id,
          content: resultText
        });

      if (msgError) {
        console.error(`Lỗi gửi tin nhắn thông báo kết quả kèo ${bet.id}:`, msgError.message);
      }
    }
  } catch (err: any) {
    console.error(`Lỗi trong autoResolveCustomBets cho trận ${matchId}:`, err);
  }
}

/**
 * Tính toán và cập nhật lại điểm số của tất cả các dự đoán cho các trận đấu đã kết thúc (FT).
 * Sau đó cập nhật lại tổng điểm (points, số lần đoán trúng tỉ số, số lần đoán trúng kết quả) trong bảng profiles.
 * Đồng thời reset lại điểm số về NULL nếu trận đấu bị đổi trạng thái từ FT về LIVE hoặc NS.
 */
export async function recalculateAllPendingPoints(): Promise<{ success: boolean; message: string; updatedPredictionsCount: number }> {
  const supabase = createAdminClient();

  try {
    let totalUpdatedPredictions = 0;
    const affectedUserIds = new Set<string>();

    // 1. Reset điểm số về NULL cho các dự đoán của trận đấu chưa kết thúc (NS, LIVE)
    // Trường hợp này xử lý nếu Admin vô tình đổi trạng thái trận đấu từ FT sang LIVE hoặc NS
    const { data: activeMatches, error: activeMatchesError } = await supabase
      .from('matches')
      .select('id')
      .in('status', ['NS', 'LIVE']);

    if (!activeMatchesError && activeMatches && activeMatches.length > 0) {
      const activeMatchIds = activeMatches.map(m => m.id);
      
      const { data: invalidPredictions, error: invalidPredsError } = await supabase
        .from('predictions')
        .select('id, user_id')
        .in('match_id', activeMatchIds)
        .not('points_earned', 'is', null);

      if (!invalidPredsError && invalidPredictions && invalidPredictions.length > 0) {
        const resetUpdates = invalidPredictions.map(p => ({
          id: p.id,
          points_earned: null
        }));

        const { error: resetError } = await supabase
          .from('predictions')
          .upsert(resetUpdates, { onConflict: 'id' });

        if (!resetError) {
          invalidPredictions.forEach(p => affectedUserIds.add(p.user_id));
          totalUpdatedPredictions += resetUpdates.length;
        }
      }
    }

    // 2. Lấy danh sách các trận đấu đã kết thúc (FT) và có tỉ số hợp lệ
    const { data: finishedMatches, error: matchesError } = await supabase
      .from('matches')
      .select('id, home_score, away_score, handicap_team, handicap_value')
      .eq('status', 'FT');

    if (matchesError) {
      throw new Error(`Lỗi khi lấy danh sách trận đấu: ${matchesError.message}`);
    }

    if (finishedMatches && finishedMatches.length > 0) {
      // Duyệt qua từng trận đấu để đối chiếu và tính điểm cho các dự đoán
      for (const match of finishedMatches) {
        if (match.home_score === null || match.away_score === null) continue;

        // Tự động phân định kết quả các kèo thách đấu cá nhân liên quan
        await autoResolveCustomBets(supabase, match.id, match.home_score, match.away_score);

        // Lấy toàn bộ các dự đoán cho trận đấu này
        const { data: predictions, error: predsError } = await supabase
          .from('predictions')
          .select('id, user_id, prediction_choice, points_earned')
          .eq('match_id', match.id);

        if (predsError) {
          console.error(`Lỗi khi lấy dự đoán của trận đấu ${match.id}:`, predsError.message);
          continue;
        }

        if (!predictions || predictions.length === 0) continue;

        const predictionsToUpdate = [];
        const handicapTeam = match.handicap_team || 'none';
        const handicapVal = Number(match.handicap_value || 0);

        for (const p of predictions) {
          let points = 0;

          if (handicapTeam === 'none' || handicapVal === 0) {
            // Cược Châu Âu (1X2)
            if (p.prediction_choice === 'home' && match.home_score > match.away_score) {
              points = 3;
            } else if (p.prediction_choice === 'away' && match.home_score < match.away_score) {
              points = 3;
            } else if (p.prediction_choice === 'draw' && match.home_score === match.away_score) {
              points = 3;
            }
          } else {
            // Cược chấp Handicap
            let diff = 0;
            if (handicapTeam === 'home') {
              diff = (match.home_score - handicapVal) - match.away_score;
            } else if (handicapTeam === 'away') {
              diff = match.home_score - (match.away_score - handicapVal);
            } else {
              diff = match.home_score - match.away_score;
            }

            if (diff > 0 && p.prediction_choice === 'home') {
              points = 3;
            } else if (diff < 0 && p.prediction_choice === 'away') {
              points = 3;
            }
          }

          // Chỉ cập nhật nếu điểm mới tính khác điểm cũ trong DB (hoặc điểm cũ đang là null)
          if (p.points_earned !== points) {
            predictionsToUpdate.push({
              id: p.id,
              user_id: p.user_id,
              match_id: match.id,
              prediction_choice: p.prediction_choice,
              points_earned: points
            });
            affectedUserIds.add(p.user_id);
          }
        }

        // Thực hiện cập nhật hàng loạt (upsert) các dự đoán có thay đổi điểm số của trận này
        if (predictionsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from('predictions')
            .upsert(predictionsToUpdate, { onConflict: 'id' });

          if (upsertError) {
            console.error(`Lỗi khi lưu điểm dự đoán cho trận ${match.id}:`, upsertError.message);
          } else {
            totalUpdatedPredictions += predictionsToUpdate.length;
          }
        }
      }
    }

    // 3. Thực hiện cập nhật profiles cho các user bị ảnh hưởng (nếu có)
    if (affectedUserIds.size > 0) {
      await updateProfilesPoints(supabase, affectedUserIds);
    }

    return {
      success: true,
      message: `Đã tính điểm thành công cho các trận đấu. Cập nhật ${totalUpdatedPredictions} lượt dự đoán của ${affectedUserIds.size} người chơi.`,
      updatedPredictionsCount: totalUpdatedPredictions
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.error('Lỗi trong recalculateAllPendingPoints:', error);
    return {
      success: false,
      message: `Không thể tính điểm tự động: ${errMsg}`,
      updatedPredictionsCount: 0
    };
  }
}
