-- 1. Create Profiles Table (User details)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    exact_scores_count INTEGER DEFAULT 0,
    correct_outcomes_count INTEGER DEFAULT 0,
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
    v_is_exact BOOLEAN;
    v_is_outcome BOOLEAN;
BEGIN
    -- Only run when match is finished (status = 'FT') and scores are set
    IF NEW.status = 'FT' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
        -- Loop through all predictions for this match
        FOR r_pred IN 
            SELECT * FROM public.predictions WHERE match_id = NEW.id
        LOOP
            v_points := 0;
            v_is_exact := FALSE;
            v_is_outcome := FALSE;

            -- Check for exact score match (e.g. 2-1 and 2-1)
            IF r_pred.predicted_home_score = NEW.home_score AND r_pred.predicted_away_score = NEW.away_score THEN
                v_points := 3;
                v_is_exact := TRUE;
            -- Check for correct match outcome (e.g. home win, away win, draw)
            ELSIF (
                (r_pred.predicted_home_score > r_pred.predicted_away_score AND NEW.home_score > NEW.away_score) OR
                (r_pred.predicted_home_score < r_pred.predicted_away_score AND NEW.home_score < NEW.away_score) OR
                (r_pred.predicted_home_score = r_pred.predicted_away_score AND NEW.home_score = NEW.away_score)
            ) THEN
                v_points := 1;
                v_is_outcome := TRUE;
            END IF;

            -- Update prediction with points earned
            UPDATE public.predictions 
            SET points_earned = v_points 
            WHERE id = r_pred.id;

        END LOOP;

        -- Recalculate profiles total points
        -- We do this for all profiles to ensure consistency
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

CREATE OR REPLACE TRIGGER on_match_updated_calculate_points
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score)
    EXECUTE FUNCTION public.calculate_prediction_points();
