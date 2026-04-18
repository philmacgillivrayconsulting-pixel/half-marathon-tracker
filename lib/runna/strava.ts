// Strava client.
//
// OAuth + activity listing. Strava tokens expire every 6h; we refresh on
// demand using the stored refresh token.

import type { RaceTimes, RunnerProfile } from './types.ts';
import {
  getIntegration,
  saveIntegration,
  upsertActivities,
  type IntegrationTokens,
  type StoredActivity,
} from './storage.ts';

const OAUTH_AUTH = 'https://www.strava.com/oauth/authorize';
const OAUTH_TOKEN = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

export const STRAVA_SCOPES = 'read,activity:read_all,profile:read_all';

export function stravaConfigured(): boolean {
  return !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPES,
    state,
  });
  return `${OAUTH_AUTH}?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
): Promise<IntegrationTokens & { athlete_id?: number }> {
  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? '',
    client_secret: process.env.STRAVA_CLIENT_SECRET ?? '',
    code,
    grant_type: 'authorization_code',
  });
  const resp = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`strava token exchange ${resp.status}`);
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id: number };
  };
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.expires_at * 1000).toISOString(),
    athlete_id: data.athlete?.id,
    extra: data.athlete ? { athlete_id: data.athlete.id } : {},
  };
}

async function refreshIfNeeded(
  runner_id: string,
): Promise<IntegrationTokens> {
  const tokens = await getIntegration(runner_id, 'strava');
  if (!tokens) throw new Error('strava not connected');
  const expiresAt = tokens.expires_at
    ? new Date(tokens.expires_at).getTime()
    : 0;
  if (expiresAt > Date.now() + 60_000) return tokens;
  if (!tokens.refresh_token) return tokens;

  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? '',
    client_secret: process.env.STRAVA_CLIENT_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });
  const resp = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`strava token refresh ${resp.status}`);
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  const updated: IntegrationTokens = {
    ...tokens,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(data.expires_at * 1000).toISOString(),
  };
  await saveIntegration(runner_id, 'strava', updated);
  return updated;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  total_elevation_gain?: number;
  has_heartrate?: boolean;
  average_heartrate?: number;
}

export async function listRecentActivities(
  runner_id: string,
  days = 60,
): Promise<StoredActivity[]> {
  const tokens = await refreshIfNeeded(runner_id);
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  const resp = await fetch(
    `${API}/athlete/activities?per_page=100&after=${after}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!resp.ok) throw new Error(`strava activities ${resp.status}`);
  const raw = (await resp.json()) as StravaActivity[];
  return raw.map((a) => normalize(a));
}

function normalize(a: StravaActivity): StoredActivity {
  const pace =
    a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null;
  return {
    id: String(a.id),
    runner_id: '',
    start_date: a.start_date,
    distance_m: a.distance,
    moving_time_sec: a.moving_time,
    avg_pace_sec_per_km: pace,
    activity_type: a.sport_type || a.type,
    matched_workout_id: null,
    raw: a as unknown,
  };
}

/**
 * Pull and persist recent activities for a runner, returning the stored
 * rows (with runner_id filled in).
 */
export async function importRecentActivities(
  runner_id: string,
  days = 60,
): Promise<StoredActivity[]> {
  const rows = await listRecentActivities(runner_id, days);
  const withRunner = rows.map((r) => ({ ...r, runner_id }));
  // Strip runner_id before upsert — storage.upsertActivities fills it back in.
  await upsertActivities(
    runner_id,
    withRunner.map(({ runner_id: _rid, ...rest }) => rest),
  );
  return withRunner;
}

/** Detect a recent race-distance PR to update the profile's anchor. */
export function detectRacePR(
  activities: StoredActivity[],
): Partial<RaceTimes> {
  const out: Partial<RaceTimes> = {};
  const bands: Array<{
    key: keyof RaceTimes;
    low: number;
    high: number;
  }> = [
    { key: 'fiveK_seconds', low: 4800, high: 5200 },
    { key: 'tenK_seconds', low: 9800, high: 10400 },
    { key: 'halfMarathon_seconds', low: 20800, high: 21500 },
    { key: 'marathon_seconds', low: 41800, high: 42800 },
  ];
  for (const b of bands) {
    const matching = activities.filter(
      (a) =>
        a.distance_m >= b.low && a.distance_m <= b.high && a.moving_time_sec > 0,
    );
    if (matching.length === 0) continue;
    const best = matching.reduce((m, a) =>
      a.moving_time_sec < m.moving_time_sec ? a : m,
    );
    out[b.key] = best.moving_time_sec;
  }
  return out;
}
