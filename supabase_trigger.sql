-- =======================================================================
-- SQL TRIGGER TỰ ĐỘNG TÍNH ĐIỂM DỰ ĐOÁN WORLD CUP 2026
-- Hướng dẫn: Copy toàn bộ nội dung file này và paste vào phần
-- SQL Editor trên Supabase Dashboard của bạn, sau đó nhấn Run.
-- =======================================================================

-- 1. Tạo hàm tính điểm dự đoán theo luật mới: Thắng được 1 điểm, Hòa/Thua được cộng loss_points (Admin set)
CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
RETURNS TRIGGER AS $$
DECLARE
    r_pred RECORD;
    v_points INTEGER;
    v_is_correct BOOLEAN;
    v_handicap_team TEXT;
    v_handicap_val NUMERIC;
    v_diff NUMERIC;
    v_loss_points INTEGER;
BEGIN
    -- Chỉ chạy khi trạng thái trận đấu chuyển sang 'FT' (Finished) và tỉ số đã được điền đầy đủ
    IF NEW.status = 'FT' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
        
        v_handicap_team := COALESCE(NEW.handicap_team, 'none');
        v_handicap_val := COALESCE(NEW.handicap_value, 0);
        v_loss_points := COALESCE(NEW.loss_points, 0);

        -- Duyệt qua tất cả các dự đoán của trận đấu này
        FOR r_pred IN 
            SELECT * FROM public.predictions WHERE match_id = NEW.id
        LOOP
            v_is_correct := FALSE;
            v_points := 0;

            IF v_handicap_team = 'none' OR v_handicap_val = 0 THEN
                -- 1. Cược Châu Âu (1X2) - Lưu ý: UI chỉ cho chọn home hoặc away
                IF NEW.home_score > NEW.away_score THEN
                    -- Home thắng
                    IF r_pred.prediction_choice = 'home' THEN
                        v_is_correct := TRUE;
                    END IF;
                ELSIF NEW.home_score < NEW.away_score THEN
                    -- Away thắng
                    IF r_pred.prediction_choice = 'away' THEN
                        v_is_correct := TRUE;
                    END IF;
                END IF;
            ELSE
                -- 2. Cược chấp Handicap
                IF v_handicap_team = 'home' THEN
                    v_diff := (NEW.home_score - v_handicap_val) - NEW.away_score;
                ELSIF v_handicap_team = 'away' THEN
                    v_diff := NEW.home_score - (NEW.away_score - v_handicap_val);
                ELSE
                    v_diff := NEW.home_score - NEW.away_score;
                END IF;

                IF v_diff > 0 THEN
                    -- Home thắng kèo
                    IF r_pred.prediction_choice = 'home' THEN
                        v_is_correct := TRUE;
                    END IF;
                ELSIF v_diff < 0 THEN
                    -- Away thắng kèo
                    IF r_pred.prediction_choice = 'away' THEN
                        v_is_correct := TRUE;
                    END IF;
                END IF;
            END IF;

            -- Nếu dự đoán đúng -> được 1 điểm. Nếu đoán sai -> được điểm thua của trận
            IF v_is_correct THEN
                v_points := 1;
            ELSE
                v_points := v_loss_points;
            END IF;

            -- Cập nhật dự đoán
            UPDATE public.predictions 
            SET 
                is_correct = v_is_correct,
                points_earned = v_points 
            WHERE id = r_pred.id;

        END LOOP;

        -- Tính toán lại tổng điểm cho tất cả hồ sơ người dùng (profiles) để đảm bảo đồng nhất
        UPDATE public.profiles p
        SET 
            correct_predictions_count = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND is_correct = TRUE), 0),
            total_loss_points = COALESCE((SELECT SUM(points_earned) FROM public.predictions WHERE user_id = p.id AND is_correct = FALSE), 0),
            points = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND is_correct = TRUE), 0) + 
                     COALESCE((SELECT SUM(points_earned) FROM public.predictions WHERE user_id = p.id AND is_correct = FALSE), 0),
            updated_at = now()
        WHERE p.id IN (SELECT DISTINCT user_id FROM public.predictions WHERE match_id = NEW.id);

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tạo Trigger liên kết với bảng matches
-- Trigger này sẽ kích hoạt khi trạng thái hoặc tỉ số trận đấu thay đổi
DROP TRIGGER IF EXISTS on_match_updated_calculate_points ON public.matches;

CREATE TRIGGER on_match_updated_calculate_points
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score)
    EXECUTE FUNCTION public.calculate_prediction_points();
