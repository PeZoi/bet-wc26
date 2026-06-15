-- 1. Create Profiles Table (User details)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    exact_scores_count INTEGER DEFAULT 0,
    correct_outcomes_count INTEGER DEFAULT 0,
    total_loss_points INTEGER DEFAULT 0,
    correct_predictions_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. Create Matches Table (WC 2026 matches)
CREATE TABLE public.matches (
    id INT PRIMARY KEY, -- Using API-Football fixture ID as primary key
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_logo TEXT,
    away_logo TEXT,
    match_time TIMESTAMP WITH TIME ZONE NOT NULL,
    stage TEXT NOT NULL, -- "Group Stage", "Round of 16", etc.
    home_score INT,
    away_score INT,
    status TEXT DEFAULT 'NS', -- 'NS' (Not Started), 'LIVE', 'FT' (Finished)
    loss_points INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Matches Policies
CREATE POLICY "Matches are viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Only Service Role or Admin can modify matches" 
ON public.matches FOR ALL 
USING (true) 
WITH CHECK (true); -- Server Actions using service_role bypass RLS or run with service role client

-- 3. Create Predictions Table
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id INT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    predicted_home_score INT NOT NULL,
    predicted_away_score INT NOT NULL,
    points_earned INT, -- NULL until match is finished
    is_correct BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_match UNIQUE (user_id, match_id)
);

-- Enable RLS on predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Predictions Policies
-- A user can view their own predictions at any time.
-- Other users' predictions can only be viewed after the match starts.
CREATE POLICY "Users can view predictions" 
ON public.predictions FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE matches.id = predictions.match_id 
        AND matches.match_time < timezone('utc'::text, now())
    )
);

-- A user can only create their own predictions
CREATE POLICY "Users can insert their own predictions" 
ON public.predictions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    AND 
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE matches.id = predictions.match_id 
        AND matches.match_time > timezone('utc'::text, now()) + INTERVAL '5 minutes' -- prediction lock 5 mins before match
    )
);

-- A user can only update their own predictions before match starts
CREATE POLICY "Users can update their own predictions" 
ON public.predictions FOR UPDATE 
USING (
    auth.uid() = user_id 
    AND 
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE matches.id = predictions.match_id 
        AND matches.match_time > timezone('utc'::text, now()) + INTERVAL '5 minutes'
    )
);

-- A user can delete their own predictions before match starts
CREATE POLICY "Users can delete their own predictions" 
ON public.predictions FOR DELETE 
USING (
    auth.uid() = user_id 
    AND 
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE matches.id = predictions.match_id 
        AND matches.match_time > timezone('utc'::text, now()) + INTERVAL '5 minutes'
    )
);

-- 4. Auth Trigger for Profiles
-- Automatically create profile when a user signs up via Google Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User_' || substr(new.id::text, 1, 6)),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Trigger/Function to Recalculate Points when Match is Finished
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
            exact_scores_count = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND is_correct = TRUE), 0),
            total_loss_points = COALESCE((SELECT SUM(points_earned) FROM public.predictions WHERE user_id = p.id AND is_correct = FALSE), 0),
            points = COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND is_correct = TRUE), 0), -- Chỉ lấy số trận đoán đúng
            updated_at = now()
        WHERE p.id IN (SELECT DISTINCT user_id FROM public.predictions WHERE match_id = NEW.id);

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_match_updated_calculate_points
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score)
    EXECUTE FUNCTION public.calculate_prediction_points();
