// Server-side storage adapter for Runna data.
//
// Uses the service-role Supabase key when available so OAuth tokens and
// plan writes bypass RLS cleanly. Falls back to the anon client for
// read-only operations so local development still works without the
// service key.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Plan, RunnerProfile } from './types.ts';

let _admin: SupabaseClient | null = null;

function adminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  _admin = createClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder',
    { auth: { persistSession: false } },
  );
  return _admin;
}

export function storageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

// ─── Profiles ──────────────────────────────────────────────────────────

export async function upsertProfile(profile: RunnerProfile): Promise<void> {
  const { error } = await adminClient()
    .from('runner_profiles')
    .upsert({ id: profile.id, profile, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getProfile(
  runner_id: string,
): Promise<RunnerProfile | null> {
  const { data, error } = await adminClient()
    .from('runner_profiles')
    .select('profile')
    .eq('id', runner_id)
    .maybeSingle();
  if (error) throw error;
  return (data?.profile as RunnerProfile | undefined) ?? null;
}

// ─── Plans ─────────────────────────────────────────────────────────────

export async function saveActivePlan(plan: Plan): Promise<void> {
  const client = adminClient();
  // Deactivate any previous active plan for this runner.
  const deactivate = await client
    .from('training_plans')
    .update({ active: false })
    .eq('runner_id', plan.runner_id)
    .eq('active', true);
  if (deactivate.error) throw deactivate.error;
  const { error } = await client.from('training_plans').upsert({
    id: plan.id,
    runner_id: plan.runner_id,
    plan,
    active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getActivePlan(
  runner_id: string,
): Promise<Plan | null> {
  const { data, error } = await adminClient()
    .from('training_plans')
    .select('plan')
    .eq('runner_id', runner_id)
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.plan as Plan | undefined) ?? null;
}

export async function updatePlan(plan: Plan): Promise<void> {
  const { error } = await adminClient()
    .from('training_plans')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', plan.id);
  if (error) throw error;
}

// ─── OAuth integrations ────────────────────────────────────────────────

export type Provider = 'strava' | 'google';

export interface IntegrationTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
  extra?: Record<string, unknown>;
}

export async function saveIntegration(
  runner_id: string,
  provider: Provider,
  tokens: IntegrationTokens,
): Promise<void> {
  const { error } = await adminClient().from('runna_integrations').upsert({
    runner_id,
    provider,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    scope: tokens.scope,
    extra: tokens.extra ?? {},
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getIntegration(
  runner_id: string,
  provider: Provider,
): Promise<IntegrationTokens | null> {
  const { data, error } = await adminClient()
    .from('runna_integrations')
    .select('access_token, refresh_token, expires_at, scope, extra')
    .eq('runner_id', runner_id)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return (data as IntegrationTokens | null) ?? null;
}

export async function deleteIntegration(
  runner_id: string,
  provider: Provider,
): Promise<void> {
  const { error } = await adminClient()
    .from('runna_integrations')
    .delete()
    .eq('runner_id', runner_id)
    .eq('provider', provider);
  if (error) throw error;
}

// ─── Activities ────────────────────────────────────────────────────────

export interface StoredActivity {
  id: string;
  runner_id: string;
  start_date: string;
  distance_m: number;
  moving_time_sec: number;
  avg_pace_sec_per_km: number | null;
  activity_type: string | null;
  matched_workout_id: string | null;
  raw: unknown;
}

export async function upsertActivities(
  runner_id: string,
  activities: Omit<StoredActivity, 'runner_id'>[],
): Promise<void> {
  if (activities.length === 0) return;
  const rows = activities.map((a) => ({ ...a, runner_id }));
  const { error } = await adminClient()
    .from('runna_activities')
    .upsert(rows);
  if (error) throw error;
}

export async function listActivities(
  runner_id: string,
  sinceISO?: string,
): Promise<StoredActivity[]> {
  let q = adminClient()
    .from('runna_activities')
    .select('*')
    .eq('runner_id', runner_id)
    .order('start_date', { ascending: false })
    .limit(200);
  if (sinceISO) q = q.gte('start_date', sinceISO);
  const { data, error } = await q;
  if (error) throw error;
  return (data as StoredActivity[]) ?? [];
}

export async function setActivityMatch(
  activity_id: string,
  workout_id: string | null,
): Promise<void> {
  const { error } = await adminClient()
    .from('runna_activities')
    .update({ matched_workout_id: workout_id })
    .eq('id', activity_id);
  if (error) throw error;
}
