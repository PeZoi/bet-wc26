import { createAdminClient } from '@/lib/supabase/server';
import { recalculateAllPendingPoints } from '@/lib/points';
import axios from 'axios';
import https from 'https';

/**
 * Translate round name from API-Football to Vietnamese.
 */
function translateRound(round: string): string {
  if (round.toLowerCase().includes('group stage')) {
    const parts = round.split('-');
    if (parts.length > 1) {
      return `Vòng bảng - Lượt ${parts[1].trim()}`;
    }
    return 'Vòng bảng';
  }
  if (round.toLowerCase().includes('round of 32')) return 'Vòng 1/32';
  if (round.toLowerCase().includes('round of 16')) return 'Vòng 1/16';
  if (round.toLowerCase().includes('quarter-finals')) return 'Tứ kết';
  if (round.toLowerCase().includes('semi-finals')) return 'Bán kết';
  if (round.toLowerCase().includes('final')) return 'Chung kết';
  return round;
}

const STADIUM_OFFSETS: Record<string, number> = {
  '1': -6, // Estadio Azteca (Mexico City) -> CST (UTC-6)
  '2': -6, // Estadio Akron (Guadalajara) -> CST (UTC-6)
  '3': -6, // Estadio BBVA (Monterrey) -> CST (UTC-6)
  '4': -5, // AT&T Stadium (Dallas) -> CDT (UTC-5)
  '5': -5, // NRG Stadium (Houston) -> CDT (UTC-5)
  '6': -5, // GEHA Field at Arrowhead Stadium (Kansas City) -> CDT (UTC-5)
  '7': -4, // Mercedes-Benz Stadium (Atlanta) -> EDT (UTC-4)
  '8': -4, // Hard Rock Stadium (Miami) -> EDT (UTC-4)
  '9': -4, // Gillette Stadium (Boston) -> EDT (UTC-4)
  '10': -4, // Lincoln Financial Field (Philadelphia) -> EDT (UTC-4)
  '11': -4, // MetLife Stadium (New York/New Jersey) -> EDT (UTC-4)
  '12': -4, // BMO Field (Toronto) -> EDT (UTC-4)
  '13': -7, // BC Place (Vancouver) -> PDT (UTC-7)
  '14': -7, // Lumen Field (Seattle) -> PDT (UTC-7)
  '15': -7, // Levi's Stadium (San Francisco) -> PDT (UTC-7)
  '16': -7, // SoFi Stadium (Los Angeles) -> PDT (UTC-7)
};

// Axios instance optimized for API sync: timeout 15s, browser User-Agent, and bypassed SSL checks
const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Bỏ qua xác thực chứng chỉ SSL (tối quan trọng cho domain .ir trên local Node.js)
  })
});

const CORSPROXY_KEY = process.env.CORSPROXY_KEY || 'ebfba0cb';

/**
 * Trích xuất tỉ số 90 phút từ danh sách scorers của API.
 * Đếm số lượng bàn thắng được ghi trước hoặc trong phút 90 (bao gồm bù giờ, ví dụ "90+2'").
 */
function parseScore90FromScorers(totalScore: number, scorers: string | null | undefined): number {
  if (!scorers || scorers === 'null' || !scorers.trim()) return totalScore;
  try {
    // scorers có dạng: {"Romelu Lukaku 86'","Youri Tielemans 89'"} hoặc "{“J. Quiñones 9'”,”R. Jiménez 67'”}"
    // Lấy tất cả các số phút trước ký tự '
    const matches = scorers.match(/\d+(?:\+\d+)?'/g);
    if (!matches) return totalScore;
    
    let score90 = 0;
    for (const m of matches) {
      const minStr = m.split('+')[0].replace("'", "");
      const minute = parseInt(minStr, 10);
      if (!isNaN(minute) && minute <= 90) {
        score90++;
      }
    }
    return score90;
  } catch (e) {
    console.error('Lỗi khi parse scorers:', e);
    return totalScore;
  }
}

/**
 * Sync fixtures/matches list from worldcup26.ir to database (with fallback to API-Football and mockMatches).
 */
export async function syncMatchesHelper() {
  const supabase = createAdminClient();
  let layer1Error = '';

  // LAYER 1: worldcup26.ir (Open-source free API)
  try {
    console.log('Fetching matches from worldcup26.ir via Axios...');

    // 1. Fetch Teams for Flags mapping
    let teamsResponse;
    try {
      teamsResponse = await axiosInstance.get('https://worldcup26.ir/get/teams', { timeout: 15000 });
    } catch (err) {
      console.warn('Direct fetch teams failed, trying proxy...', err instanceof Error ? err.message : String(err));
      try {
        teamsResponse = await axiosInstance.get(`https://corsproxy.io/?key=${CORSPROXY_KEY}&url=https://worldcup26.ir/get/teams`, { timeout: 15000 });
      } catch (proxyErr) {
        console.warn('corsproxy.io failed, trying allorigins...', proxyErr instanceof Error ? proxyErr.message : String(proxyErr));
        teamsResponse = await axiosInstance.get('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://worldcup26.ir/get/teams'), { timeout: 15000 });
      }
    }
    let teamsData = teamsResponse.data;
    if (typeof teamsData === 'string') {
      try {
        teamsData = JSON.parse(teamsData);
      } catch (e) {
        console.error('Failed to parse teams proxy JSON:', e);
      }
    }
    const teamsList = teamsData?.teams || [];
    const teamIdToFlagMap = new Map<string, string>();
    teamsList.forEach((t: { id: string; flag: string }) => {
      teamIdToFlagMap.set(t.id, t.flag);
    });

    // 2. Fetch Games
    let gamesResponse;
    try {
      gamesResponse = await axiosInstance.get('https://worldcup26.ir/get/games', { timeout: 15000 });
    } catch (err) {
      console.warn('Direct fetch games failed, trying proxy...', err instanceof Error ? err.message : String(err));
      try {
        gamesResponse = await axiosInstance.get(`https://corsproxy.io/?key=${CORSPROXY_KEY}&url=https://worldcup26.ir/get/games`, { timeout: 15000 });
      } catch (proxyErr) {
        console.warn('corsproxy.io failed, trying allorigins...', proxyErr instanceof Error ? proxyErr.message : String(proxyErr));
        gamesResponse = await axiosInstance.get('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://worldcup26.ir/get/games'), { timeout: 15000 });
      }
    }

    let gamesData = gamesResponse.data;
    if (typeof gamesData === 'string') {
      try {
        gamesData = JSON.parse(gamesData);
      } catch (e) {
        console.error('Failed to parse games proxy JSON:', e);
      }
    }
    const gamesList = gamesData?.games || [];

    if (gamesList.length === 0) {
      throw new Error('worldcup26.ir returned empty games list');
    }

    const translateStage = (game: { type: string; group: string }): string => {
      const type = game.type;
      if (type === 'group') {
        return `Bảng ${game.group}`;
      }
      if (type === 'r32') return 'Vòng 1/32';
      if (type === 'r16') return 'Vòng 1/16';
      if (type === 'qf') return 'Tứ kết';
      if (type === 'sf') return 'Bán kết';
      if (type === 'third') return 'Tranh hạng ba';
      if (type === 'final') return 'Chung kết';
      return type;
    };

    const parseLocalDate = (localDateStr: string, stadiumId: string): string => {
      try {
        const [datePart, timePart] = localDateStr.split(' ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute] = timePart.split(':');

        const offset = STADIUM_OFFSETS[stadiumId] ?? -5; // Mặc định là -5 (CDT) nếu không tìm thấy

        const date = new Date(Date.UTC(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10)
        ));

        // Điều chỉnh múi giờ về UTC thực tế: UTC = Local - Offset
        date.setUTCHours(date.getUTCHours() - offset);

        return date.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const matchesToUpsert = gamesList.map((game: {
      id: string;
      home_team_id: string;
      away_team_id: string;
      home_team_name_en: string;
      away_team_name_en: string;
      home_score: string;
      away_score: string;
      finished: string;
      time_elapsed: string;
      type: string;
      group: string;
      local_date: string;
      stadium_id: string;
      home_team_label?: string;
      away_team_label?: string;
      home_scorers?: string | null;
      away_scorers?: string | null;
      home_penalty_score?: string | null;
      away_penalty_score?: string | null;
    }) => {
      const id = parseInt(game.id, 10);
      const isFinished = game.finished === 'TRUE';
      const isNotStarted = game.time_elapsed === 'notstarted';
      const status = isFinished ? 'FT' : (isNotStarted ? 'NS' : 'LIVE');

      let home_team = game.home_team_name_en;
      let away_team = game.away_team_name_en;
      let home_logo = '';
      let away_logo = '';

      if (game.home_team_id === '0' || !home_team) {
        home_team = game.home_team_label || 'TBD';
        home_logo = 'https://flagcdn.com/w160/un.png';
      } else {
        home_logo = teamIdToFlagMap.get(game.home_team_id) || 'https://flagcdn.com/w160/un.png';
      }

      if (game.away_team_id === '0' || !away_team) {
        away_team = game.away_team_label || 'TBD';
        away_logo = 'https://flagcdn.com/w160/un.png';
      } else {
        away_logo = teamIdToFlagMap.get(game.away_team_id) || 'https://flagcdn.com/w160/un.png';
      }

      // Convert flag URL to higher resolution / cleaner w160 flag CDN format if they are standard flagcdn
      if (home_logo.includes('flagcdn.com')) {
        home_logo = home_logo.replace('/w80/', '/w160/');
      }
      if (away_logo.includes('flagcdn.com')) {
        away_logo = away_logo.replace('/w80/', '/w160/');
      }

      const parsePenalty = (val: string | null | undefined): number | null => {
        if (!val || val === 'null') return null;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      };

      const rawHomeScore = (status === 'FT' || status === 'LIVE') ? parseInt(game.home_score, 10) : null;
      const rawAwayScore = (status === 'FT' || status === 'LIVE') ? parseInt(game.away_score, 10) : null;
      const homePenalty = parsePenalty(game.home_penalty_score);
      const awayPenalty = parsePenalty(game.away_penalty_score);

      let home_score_90 = null;
      let away_score_90 = null;

      if (status === 'FT' || status === 'LIVE') {
        if (homePenalty !== null || awayPenalty !== null) {
          // Trận đấu đi vào loạt penalty -> Tỉ số 90 phút chắc chắn là HÒA (lấy rawHomeScore, rawAwayScore vì lúc này API thường trả về tỉ số hòa sau 120 phút)
          home_score_90 = rawHomeScore;
          away_score_90 = rawAwayScore;
        } else if (rawHomeScore !== null && rawAwayScore !== null && !game.type.includes('group')) {
          // Trận knockout có kết quả thắng thua (có thể kết thúc ở 90p hoặc 120p)
          // Ta parse scorers để xem có bàn thắng hiệp phụ (> 90) không
          home_score_90 = parseScore90FromScorers(rawHomeScore, game.home_scorers);
          away_score_90 = parseScore90FromScorers(rawAwayScore, game.away_scorers);
        } else {
          // Vòng bảng hoặc trận thông thường: tỉ số 90p chính là tỉ số chung cuộc
          home_score_90 = rawHomeScore;
          away_score_90 = rawAwayScore;
        }
      }

      return {
        id,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_time: parseLocalDate(game.local_date, game.stadium_id),
        stage: translateStage(game),
        home_score: rawHomeScore,
        away_score: rawAwayScore,
        home_score_90,
        away_score_90,
        status,
        home_scorers: game.home_scorers || null,
        away_scorers: game.away_scorers || null,
        home_penalty_score: homePenalty,
        away_penalty_score: awayPenalty,
        updated_at: new Date().toISOString()
      };
    });

    if (matchesToUpsert.length > 0) {
      // Clean up any matches that are not in this new API response (e.g. old mock matches 1001-1012)
      const apiIds = matchesToUpsert.map((m: { id: number }) => m.id);
      const { data: currentMatches } = await supabase
        .from('matches')
        .select('id');

      if (currentMatches && currentMatches.length > 0) {
        const idsToDelete = (currentMatches as { id: number }[])
          .map((m) => m.id)
          .filter((id) => !apiIds.includes(id));

        if (idsToDelete.length > 0) {
          console.log(`Deleting ${idsToDelete.length} outdated/mock matches from database...`);
          await supabase
            .from('matches')
            .delete()
            .in('id', idsToDelete);
        }
      }

      const { error } = await supabase
        .from('matches')
        .upsert(matchesToUpsert, { onConflict: 'id' });
      if (error) throw error;
      console.log(`Successfully synced ${matchesToUpsert.length} matches from worldcup26.ir`);

      // Tự động tính điểm cho các dự đoán sau khi đồng bộ dữ liệu trận đấu
      await recalculateAllPendingPoints();

      return matchesToUpsert.length;
    }
  } catch (error: unknown) {
    const getErrorMessage = (err: unknown): string => {
      if (!err) return 'Unknown error';
      const errorObj = err as Record<string, unknown>;
      if (errorObj.response) {
        const response = errorObj.response as Record<string, unknown>;
        return `API Error ${String(response.status)}: ${typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data)}`;
      }
      if (errorObj.request) {
        return `Network Error (No response): ${String(errorObj.message || errorObj.code || 'Timeout/Blocked')}`;
      }
      return err instanceof Error ? err.message : String(err);
    };
    layer1Error = getErrorMessage(error);
    console.warn('worldcup26.ir sync failed, trying fallback to API-Football/API-Sports:', layer1Error);
  }

  // LAYER 2: API-Football/API-Sports (Fallback if key configured)
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com';

  if (apiKey && apiKey !== 'your_rapidapi_key_here') {
    try {
      console.log('Fetching fallback matches from API-Football...');
      const isRapidApi = apiHost.toLowerCase().includes('rapidapi');
      const basePath = isRapidApi ? '/v3' : '';

      const response = await axiosInstance.get(
        `https://${apiHost}${basePath}/fixtures?league=1&season=2026`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-apisports-key': apiKey,
            'x-rapidapi-host': apiHost,
          }
        }
      );

      const data = response.data;

      interface ApiFixtureItem {
        fixture: {
          id: number;
          date: string;
          status: {
            short: 'NS' | 'LIVE' | 'FT' | string;
          };
        };
        teams: {
          home: {
            name: string;
            logo: string;
          };
          away: {
            name: string;
            logo: string;
          };
        };
        goals: {
          home: number | null;
          away: number | null;
        };
        league: {
          round: string;
        };
        score: {
          fulltime: {
            home: number | null;
            away: number | null;
          };
          extratime: {
            home: number | null;
            away: number | null;
          };
          penalty: {
            home: number | null;
            away: number | null;
          };
        };
      }

      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        const matchesToUpsert = (data.response as ApiFixtureItem[]).map((item) => {
          const isKnockout = !item.league.round.toLowerCase().includes('group');
          let home_score = item.goals.home;
          let away_score = item.goals.away;
          let home_score_90 = item.goals.home;
          let away_score_90 = item.goals.away;
          let home_penalty_score = item.score.penalty.home;
          let away_penalty_score = item.score.penalty.away;

          // Nếu là trận knockout và có hiệp phụ hoặc penalty
          if (isKnockout && (item.score.extratime.home !== null || item.score.penalty.home !== null)) {
            // Tỉ số 90 phút chính là tỉ số fulltime
            home_score_90 = item.score.fulltime.home;
            away_score_90 = item.score.fulltime.away;
            
            // Nếu không có penalty (thắng ở hiệp phụ), ta dùng tỉ số sau hiệp phụ (120 phút) làm penalty score giả lập để vẽ nhánh đi tiếp
            if (item.score.penalty.home === null && item.score.extratime.home !== null) {
              home_penalty_score = item.goals.home;
              away_penalty_score = item.goals.away;
              // Đồng thời tỉ số chính (home_score/away_score) vẫn là tỉ số 90 phút để đảm bảo hiển thị đúng và đồng bộ
              home_score = item.score.fulltime.home;
              away_score = item.score.fulltime.away;
            }
          }

          return {
            id: item.fixture.id,
            home_team: item.teams.home.name,
            away_team: item.teams.away.name,
            home_logo: item.teams.home.logo,
            away_logo: item.teams.away.logo,
            match_time: item.fixture.date,
            stage: translateRound(item.league.round),
            home_score,
            away_score,
            home_score_90,
            away_score_90,
            home_penalty_score,
            away_penalty_score,
            status: item.fixture.status.short,
            updated_at: new Date().toISOString()
          };
        });

        // Clean up any matches that are not in this new API response (e.g. old mock matches 1001-1012)
        const apiIds = matchesToUpsert.map((m: { id: number }) => m.id);
        const { data: currentMatches } = await supabase
          .from('matches')
          .select('id');

        if (currentMatches && currentMatches.length > 0) {
          const idsToDelete = (currentMatches as { id: number }[])
            .map((m) => m.id)
            .filter((id) => !apiIds.includes(id));

          if (idsToDelete.length > 0) {
            console.log(`Deleting ${idsToDelete.length} outdated/mock matches from database...`);
            await supabase
              .from('matches')
              .delete()
              .in('id', idsToDelete);
          }
        }

        const { error } = await supabase
          .from('matches')
          .upsert(matchesToUpsert, { onConflict: 'id' });

        if (error) throw error;
        console.log(`Successfully synced ${matchesToUpsert.length} matches from fallback API-Football`);

        // Tự động tính điểm cho các dự đoán sau khi đồng bộ dữ liệu trận đấu
        await recalculateAllPendingPoints();

        return matchesToUpsert.length;
      }
    } catch (fallbackError) {
      console.warn('API-Football fallback failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
    }
  }

  // If we reach here, it means both worldcup26.ir and API-Football failed
  throw new Error(`Sync failed. worldcup26.ir error: ${layer1Error || 'Unknown'}`);
}

/**
 * Sync scores of active matches.
 * Calling syncMatchesHelper(false) does a complete update of matches and their scores,
 * so we can reuse it to keep it extremely simple.
 */
export async function syncScoresHelper() {
  try {
    const updatedCount = await syncMatchesHelper();
    return { success: true, updatedCount };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating scores';
    return { success: false, message };
  }
}

/**
 * Throttle sync requests to prevent rate limit exhaustion.
 * Runs sync if the database has not been synced in the last 10 minutes.
 */
export async function autoSyncThrottled() {
  try {
    const supabase = createAdminClient();

    // Check most recently updated match time
    const { data } = await supabase
      .from('matches')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    const latestMatch = data?.[0];
    const lastSync = latestMatch ? new Date(latestMatch.updated_at).getTime() : 0;
    const now = Date.now();

    // 10 minutes throttle
    if (now - lastSync > 10 * 60 * 1000) {
      console.log('Throttled auto-sync triggered...');
      await syncMatchesHelper();
    }
  } catch (error) {
    console.warn('Error during autoSyncThrottled:', error instanceof Error ? error.message : String(error));
  }
}