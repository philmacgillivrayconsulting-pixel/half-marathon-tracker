export interface Race {
  id: number;
  name: string;
  city: string;
  country: string;
  race_day: number | null;
  race_month: string | null;
  race_year: number | null;
  course_type: string;
  pb_score: number;
  weather: string;
  url: string;
  notes: string;
  created_at: string;
}

export interface Wishlist {
  id: number;
  race_id: number;
  user_name: string;
  created_at: string;
}

export interface Signup {
  id: number;
  race_id: number;
  user_name: string;
  created_at: string;
}

export const MONTH_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isPast(race: Race): boolean {
  if (!race.race_year || !race.race_month) return false;
  const d = new Date(race.race_year, (MONTH_NUM[race.race_month] || 1) - 1, race.race_day || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function formatDate(race: Race): string {
  return [race.race_day, race.race_month, race.race_year].filter(Boolean).join(' ') || '\u2014';
}

export function raceSortDate(race: Race): number {
  if (!race.race_year || !race.race_month) return 0;
  return race.race_year * 10000 + (MONTH_NUM[race.race_month] || 0) * 100 + (race.race_day || 0);
}
