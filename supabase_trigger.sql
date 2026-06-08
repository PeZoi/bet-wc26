-- =======================================================================
-- SQL TRIGGER TỰ ĐỘNG TÍNH ĐIỂM DỰ ĐOÁN WORLD CUP 2026
-- Hướng dẫn: Copy toàn bộ nội dung file này và paste vào phần
-- SQL Editor trên Supabase Dashboard của bạn, sau đó nhấn Run.
-- =======================================================================

-- 1. Tạo hàm tính điểm dự đoán
CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
RETURNS TRIGGER AS $$
DECLARE
    r_pred RECORD;
    v_points INTEGER;
    v_is_exact BOOLEAN;
    v_is_outcome BOOLEAN;
BEGIN
    -- Chỉ chạy khi trạng thái trận đấu chuyển sang 'FT' (Finished) và tỉ số đã được điền đầy đủ
    IF NEW.status = 'FT' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
        -- Duyệt qua tất cả các dự đoán của trận đấu này
        FOR r_pred IN 
            SELECT * FROM public.predictions WHERE match_id = NEW.id
        LOOP
            v_points := 0;
            v_is_exact := FALSE;
            v_is_outcome := FALSE;

            -- Kiểm tra xem có đoán trúng chính xác tỉ số (Ví dụ: đoán 2-1 và kết quả 2-1)
            IF r_pred.predicted_home_score = NEW.home_score AND r_pred.predicted_away_score = NEW.away_score THEN
                v_points := 3;
                v_is_exact := TRUE;
            -- Kiểm tra xem có đoán đúng kết quả (Ví dụ: Đội nhà thắng, Đội khách thắng, hoặc Hòa)
            ELSIF (
                (r_pred.predicted_home_score > r_pred.predicted_away_score AND NEW.home_score > NEW.away_score) OR
                (r_pred.predicted_home_score < r_pred.predicted_away_score AND NEW.home_score < NEW.away_score) OR
                (r_pred.predicted_home_score = r_pred.predicted_away_score AND NEW.home_score = NEW.away_score)
            ) THEN
                v_points := 1;
                v_is_outcome := TRUE;
            END IF;

            -- Cập nhật điểm kiếm được cho bản ghi dự đoán này
            UPDATE public.predictions 
            SET points_earned = v_points 
            WHERE id = r_pred.id;

        END LOOP;

        -- Tính toán lại tổng điểm cho tất cả hồ sơ người dùng (profiles) để đảm bảo đồng nhất
        UPDATE public.profiles p
        SET 
            points = COALESCE((SELECT SUM(points_earned) FROM public.predictions WHERE user_id = p.id), 0),
            exact_scores_count = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND points_earned = 3), 0),
            correct_outcomes_count = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND points_earned = 1), 0),
            updated_at = now();

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
