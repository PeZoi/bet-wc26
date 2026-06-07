export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  points: number;
  exact_scores_count: number;
  correct_outcomes_count: number;
  updated_at: string;
}

export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  home_logo: string;
  away_logo: string;
  match_time: string;
  stage: string;
  home_score: number | null;
  away_score: number | null;
  status: 'NS' | 'LIVE' | 'FT';
  updated_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
  created_at: string;
  profiles?: Profile;
}
