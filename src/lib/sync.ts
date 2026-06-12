import { createAdminClient } from '@/lib/supabase/server';
import { recalculateAllPendingPoints } from '@/lib/points';
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

/**
 * Fetch with a timeout to prevent blocking server-side rendering for too long.
 * Automatically handles browser headers to bypass block, and falls back to Node https module if SSL verification fails.
 */
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 5000, headers = {}, ...rest } = options;
  
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    ...headers
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...rest,
      headers: browserHeaders,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    
    // Nếu lỗi là do SSL/TLS certificate của Node.js (UNABLE_TO_VERIFY_LEAF_SIGNATURE, CERT_HAS_EXPIRED, etc.)
    // Chúng ta thử thực hiện cuộc gọi qua thư viện https của Node.js và bỏ qua xác thực chứng chỉ.
    const errStr = String(error);
    const isSslError = errStr.includes('CERT') || errStr.includes('signature') || errStr.includes('ssl') || errStr.includes('certificate') || errStr.includes('verify');
    
    if (isSslError && resource.startsWith('https')) {
      console.log(`SSL issue detected for ${resource}, retrying with node https rejectUnauthorized: false...`);
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reqOptions = {
            method: rest.method || 'GET',
            headers: browserHeaders as Record<string, string>,
            rejectUnauthorized: false, // Bỏ qua xác thực chứng chỉ SSL
            timeout: timeout
          };
          
          const req = https.request(resource, reqOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
              } else {
                reject(new Error(`Node https request failed with status: ${res.statusCode}`));
              }
            });
          });
          
          req.on('error', (err) => { reject(err); });
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Node https request timeout'));
          });
          
          if (rest.body) {
            req.write(rest.body);
          }
          req.end();
        });
        
        // Trả về một Response-like object để tương thích với API của fetch
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(data),
          text: async () => data
        } as unknown as Response;
      } catch (nodeHttpsError) {
        console.error('Fallback node https request also failed:', nodeHttpsError);
      }
    }
    
    throw error;
  }
}

/**
 * Sync fixtures/matches list from worldcup26.ir to database (with fallback to API-Football and mockMatches).
 */
export async function syncMatchesHelper() {
  const supabase = createAdminClient();

  // LAYER 1: worldcup26.ir (Open-source free API)
  try {
    console.log('Fetching matches from worldcup26.ir...');

    // 1. Fetch Teams for Flags mapping
    let teamsResponse;
    try {
      teamsResponse = await fetchWithTimeout('https://worldcup26.ir/get/teams', { timeout: 5000 });
      if (!teamsResponse.ok) throw new Error(`Status ${teamsResponse.status}`);
    } catch (err) {
      console.warn('Direct fetch teams failed, trying proxy...', err instanceof Error ? err.message : String(err));
      teamsResponse = await fetchWithTimeout('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://worldcup26.ir/get/teams'), { timeout: 8000 });
      if (!teamsResponse.ok) {
        throw new Error(`Failed to fetch teams from proxy: ${teamsResponse.status}`);
      }
    }
    const teamsData = await teamsResponse.json();
    const teamsList = teamsData.teams || [];
    const teamIdToFlagMap = new Map<string, string>();
    teamsList.forEach((t: { id: string; flag: string }) => {
      teamIdToFlagMap.set(t.id, t.flag);
    });

    // 2. Fetch Games
    let gamesResponse;
    try {
      gamesResponse = await fetchWithTimeout('https://worldcup26.ir/get/games', { timeout: 5000 });
      if (!gamesResponse.ok) throw new Error(`Status ${gamesResponse.status}`);
    } catch (err) {
      console.warn('Direct fetch games failed, trying proxy...', err instanceof Error ? err.message : String(err));
      gamesResponse = await fetchWithTimeout('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://worldcup26.ir/get/games'), { timeout: 8000 });
      if (!gamesResponse.ok) {
        throw new Error(`Failed to fetch games from proxy: ${gamesResponse.status}`);
      }
    }
    const gamesData = await gamesResponse.json();
    const gamesList = gamesData.games || [];

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

      return {
        id,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_time: parseLocalDate(game.local_date, game.stadium_id),
        stage: translateStage(game),
        home_score: (status === 'FT' || status === 'LIVE') ? parseInt(game.home_score, 10) : null,
        away_score: (status === 'FT' || status === 'LIVE') ? parseInt(game.away_score, 10) : null,
        status,
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
  } catch (error) {
    console.warn('worldcup26.ir sync failed, trying fallback to API-Football/API-Sports:', error instanceof Error ? error.message : String(error));
  }

  // LAYER 2: API-Football/API-Sports (Fallback if key configured)
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com';

  if (apiKey && apiKey !== 'your_rapidapi_key_here') {
    try {
      console.log('Fetching fallback matches from API-Football...');
      const isRapidApi = apiHost.toLowerCase().includes('rapidapi');
      const basePath = isRapidApi ? '/v3' : '';
      const response = await fetchWithTimeout(
        `https://${apiHost}${basePath}/fixtures?league=1&season=2026`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': apiKey,
            'x-apisports-key': apiKey,
            'x-rapidapi-host': apiHost,
          },
          timeout: 5000
        }
      );

      if (!response.ok) {
        throw new Error(`API response failed with status ${response.status}`);
      }

      const data = await response.json();

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
      }

      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        const matchesToUpsert = (data.response as ApiFixtureItem[]).map((item) => ({
          id: item.fixture.id,
          home_team: item.teams.home.name,
          away_team: item.teams.away.name,
          home_logo: item.teams.home.logo,
          away_logo: item.teams.away.logo,
          match_time: item.fixture.date,
          stage: translateRound(item.league.round),
          home_score: item.goals.home,
          away_score: item.goals.away,
          status: item.fixture.status.short,
          updated_at: new Date().toISOString()
        }));

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
  throw new Error('Sync failed: Both API sources (worldcup26.ir and API-Football) are currently unavailable.');
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
