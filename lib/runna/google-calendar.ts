// Google Calendar client.
//
// Minimal REST wrapper: no SDK dependency, just fetch. Enough to run the
// OAuth flow, refresh tokens, create/update events on a dedicated
// "Training Plan" calendar, and push plan workouts into it.

import { formatTarget } from './pace.ts';
import type { Plan, RunnerProfile, Workout } from './types.ts';
import {
  getIntegration,
  saveIntegration,
  type IntegrationTokens,
} from './storage.ts';

const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';

// `events` is enough for our use case — we only read/write events we own.
// `calendar` is needed to create the dedicated calendar itself.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? '';
}

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${OAUTH_AUTH}?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<IntegrationTokens> {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const resp = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`google token exchange ${resp.status}`);
  const data = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  };
}

async function refreshIfNeeded(
  runner_id: string,
): Promise<IntegrationTokens> {
  const tokens = await getIntegration(runner_id, 'google');
  if (!tokens) throw new Error('google not connected');
  const expiresAt = tokens.expires_at
    ? new Date(tokens.expires_at).getTime()
    : 0;
  if (expiresAt > Date.now() + 60_000) return tokens;
  if (!tokens.refresh_token) return tokens;

  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const resp = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`google token refresh ${resp.status}`);
  const data = (await resp.json()) as {
    access_token: string;
    expires_in: number;
  };
  const updated: IntegrationTokens = {
    ...tokens,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
  await saveIntegration(runner_id, 'google', updated);
  return updated;
}

async function api<T>(
  runner_id: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const tokens = await refreshIfNeeded(runner_id);
  const resp = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`google api ${resp.status}: ${text}`);
  }
  return (await resp.json()) as T;
}

// ─── Calendar + event helpers ─────────────────────────────────────────

const CALENDAR_TITLE = 'Training Plan';

export async function ensureTrainingCalendar(
  runner_id: string,
): Promise<string> {
  const tokens = await refreshIfNeeded(runner_id);
  const stored = (tokens.extra as Record<string, string> | undefined)
    ?.calendar_id;
  if (stored) return stored;

  const list = await api<{ items?: Array<{ id: string; summary: string }> }>(
    runner_id,
    '/users/me/calendarList',
  );
  const existing = list.items?.find((c) => c.summary === CALENDAR_TITLE);
  if (existing) {
    await saveIntegration(runner_id, 'google', {
      ...tokens,
      extra: { ...(tokens.extra ?? {}), calendar_id: existing.id },
    });
    return existing.id;
  }

  const created = await api<{ id: string }>(runner_id, '/calendars', {
    method: 'POST',
    body: JSON.stringify({
      summary: CALENDAR_TITLE,
      description: 'Auto-managed by Runna clone',
    }),
  });
  await saveIntegration(runner_id, 'google', {
    ...tokens,
    extra: { ...(tokens.extra ?? {}), calendar_id: created.id },
  });
  return created.id;
}

interface EventInsert {
  id?: string;
  summary: string;
  description: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  reminders?: { useDefault: boolean };
}

export async function syncPlan(
  runner_id: string,
  plan: Plan,
  profile: RunnerProfile,
  options: { default_time?: string; timezone?: string } = {},
): Promise<{ created: number; updated: number }> {
  const calendar_id = await ensureTrainingCalendar(runner_id);
  const defaultTime = options.default_time ?? '07:00';
  const tz = options.timezone ?? 'UTC';

  let created = 0;
  let updated = 0;

  for (const week of plan.weeks) {
    for (const w of week.workouts) {
      if (w.type === 'rest') continue;
      const event = workoutToEvent(w, profile, plan, defaultTime, tz);
      if (w.calendar_event_id) {
        await api(
          runner_id,
          `/calendars/${encodeURIComponent(calendar_id)}/events/${w.calendar_event_id}`,
          { method: 'PATCH', body: JSON.stringify(event) },
        );
        updated++;
      } else {
        const resp = await api<{ id: string }>(
          runner_id,
          `/calendars/${encodeURIComponent(calendar_id)}/events`,
          { method: 'POST', body: JSON.stringify(event) },
        );
        w.calendar_event_id = resp.id;
        created++;
      }
    }
  }

  return { created, updated };
}

function workoutToEvent(
  w: Workout,
  profile: RunnerProfile,
  plan: Plan,
  defaultTime: string,
  timezone: string,
): EventInsert {
  const start = new Date(`${w.date}T${defaultTime}:00`);
  const end = new Date(start.getTime() + w.estimated_duration_min * 60_000);
  const target = formatTarget(w.target, profile.units);

  const descLines: string[] = [
    `${w.title}`,
    `Target: ${target}`,
    `Distance: ${w.target_distance_km} km`,
    `Duration: ~${w.estimated_duration_min} min`,
    '',
  ];
  if (w.structure.warmup) descLines.push(`Warm-up: ${w.structure.warmup}`);
  if (w.structure.main_set?.length) {
    descLines.push('Main set:');
    for (const r of w.structure.main_set) {
      const dist = r.distance_m ? `${r.distance_m}m` : `${r.duration_sec}s`;
      descLines.push(`  ${r.rep}. ${dist} (rest ${r.recovery_sec ?? 60}s)`);
    }
  } else if (w.structure.main_text) {
    descLines.push(`Main: ${w.structure.main_text}`);
  }
  if (w.structure.cooldown) descLines.push(`Cool-down: ${w.structure.cooldown}`);
  descLines.push('', `Plan: ${plan.id} · Week ${w.week_number}`);

  return {
    summary: w.title,
    description: descLines.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: timezone },
    end: { dateTime: end.toISOString(), timeZone: timezone },
    reminders: { useDefault: true },
  };
}
