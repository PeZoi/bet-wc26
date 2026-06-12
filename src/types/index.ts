export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  points: number;
  exact_scores_count: number;
  correct_outcomes_count: number;
  total_loss_points?: number;
  correct_predictions_count?: number;
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
  handicap_team?: 'home' | 'away' | 'none' | null;
  handicap_value?: number;
  loss_points?: number;
  home_scorers?: string | null;
  away_scorers?: string | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: number;
  predicted_home_score?: number | null;
  predicted_away_score?: number | null;
  prediction_choice: 'home' | 'away' | 'draw';
  points_earned: number | null;
  is_correct?: boolean | null;
  created_at: string;
  profiles?: Profile;
}
