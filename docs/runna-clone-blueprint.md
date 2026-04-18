# Runna Deep Dive and Clone Blueprint

Date: 2026-04-18

## Purpose
Research and implementation brief for a local-first clone of Runna's core
behavior: plan generation, pace calculation, calendar sync, Strava sync, and
plan adaptation for beginner, returning, and intermediate runners.

Where Runna documents behavior explicitly, this doc treats that as fact. Where
logic is not public, the mechanism is labeled as inference and a practical
clone design is proposed.

## 1. Executive summary
Runna is a structured running-coaching product built around personalized
training plans, not just activity logging. Per Runna's own support docs,
mileage and pace are controlled by different levers:

- **mileage** is shaped by ability, current mileage, longest run, plan
  duration, runs per week, and training-volume settings
- **pace targets** are driven primarily by the user's estimated current race
  time

Calendar sync uses a cloud iCalendar feed. Strava sync supports both outbound
uploads and inbound activity matching.

The clone is built around four engines, in this order:
1. Profile / onboarding
2. Plan generation
3. Pace engine
4. Sync (Google Calendar + Strava)

A thin UI sits on top.

## 2. Core features to reproduce
- Personalized plans across 5K, 10K, half-marathon, marathon, plus beginner
  and return-to-running pathways
- Weekly schedule generation respecting availability and long-run day
- Workout types: easy, long, recovery, tempo, intervals, hills, strides,
  threshold, race-pace
- Pace-based and effort/RPE-based guidance (effort-led for beginners and
  returners)
- Training preferences: training volume (progressive/steady/gradual) and
  difficulty (challenging/balanced/comfortable)
- Calendar sync via iCal feed
- Strava sync both directions
- Device sync (out of scope for MVP)
- Progress tracking / insights

## 3. Onboarding question bank
### A. Goal
- main goal (habit, return, finish/improve 5K-marathon)
- specific race? distance, date, goal type, goal time

### B. Experience & current fitness
- self-assessed level
- ability band (beginner, intermediate, advanced, elite, elite plus)
- weeks of consistent running in last 3 months
- average weekly distance over last 4 weeks
- longest run in last 4 weeks, safely repeatable this week?
- recent race times (5K, 10K, HM, M)
- typical conversational easy pace if no race times
- following a structured plan recently?

### C. Schedule
- days per week, preferred weekdays, long-run day, never-possible days
- strength / cross-training
- comfort with 1 or 2 hard sessions per week

### D. Training style
- build style: light / standard / aggressive
- difficulty: comfortable / balanced / challenging
- guidance: pace or effort
- treadmill / outdoor / mixed
- units: min/km, min/mile, km/h, mph

### E. Integrations
- Strava connect, Google Calendar connect
- import recent runs, use HR/cadence/power

### F. Safety
- injury or doctor restrictions
- max long-run duration cap
- weekly mileage ceiling

## 4. Plan calculation
### What's public
Weekly mileage is influenced by ability, current weekly mileage, longest
recent run, current race times, training background, plan length, runs per
week, training preferences, and deload weeks.

Runna treats the entered current mileage as distance the runner could cover
in the first week, then adjusts up or down based on ability, run days, and
plan length. Changing race times changes paces, not mileage. Changing ability
changes broader run length/load.

### Inferred architecture
1. Pick plan template family by goal + runner type.
2. Determine starting weekly load from current mileage, longest run,
   experience.
3. Determine progression curve from plan length + build preference.
4. Distribute volume across chosen run days.
5. Place workout types into the week per schedule rules.
6. Convert session intents to pace targets via race time or RPE.
7. Insert deload / taper weeks.
8. Adapt on profile edits or synced activities.

### 2-day and 3-day patterns
**Two runs/week** — one quality, one long/easy. Long run carries a larger
share of weekly volume. For beginners, quality may become easy or run/walk
progression.

**Three runs/week** — one quality, one easy/recovery, one long run. The
cleanest and most versatile schedule; the closest to the common user
experience described in reviews.

Each has a light and aggressive variant differing by hard-session density
and progression rate.

## 5. Pace calculation
### What's public
- pace targets come from Estimated Current Race Time (current ability, not
  goal)
- paces adjust automatically as runner improves
- new-to-running and return-to-running plans are effort-based

### Inferred
Hybrid of a single "current race time" anchor, equivalence conversions, and
workout-type intensity bands, with effort fallback when precision is low.
Exact formula is private.

### Clone pace engine
1. Establish fitness anchor: recent race > recent hard workout > Strava
   estimate > self-report > effort fallback.
2. Convert to a normalized performance index (VDOT-like).
3. Map workout types to pace bands.
4. Adjust for rep length and runner level.
5. Update over time from reliable imported runs in small increments.

Example bands:
- recovery: easy pace + 20–45 s/km
- easy: conversational, RPE 3–4
- long: easy, optionally with late blocks at MP/steady
- tempo: around current HM to 10K effort, RPE 7–8
- threshold intervals: 10K pace to threshold
- short intervals: faster than threshold for 200–400m reps
- race pace: specific to event

## 6. Calendar sync
Runna publishes an iCal feed. Users subscribe from Google / Outlook / Apple.
Workouts can be moved within a week; moving outside the designated week is
restricted; colliding days swap.

### Clone approach
- **MVP:** direct Google Calendar API, one dedicated calendar, OAuth, events
  with title, start, duration, description, reminders.
- **Compatible layer:** ICS export / optional local feed server.

### Event fields
title, date+time, estimated duration, plan/week/workout IDs, description,
pace or effort targets, warm-up/cool-down, notes.

## 7. Strava sync
Runna uploads recorded workouts to Strava and imports Strava activities back
to match against the plan.

### Clone approach
- OAuth, pull activity ID, date, distance, moving/elapsed time, pace, splits,
  elevation, HR, cadence, power.
- Match: same date > nearest ±1 day > workout-type compatibility >
  distance/time compatibility > threshold to auto-match vs ask.
- Update future paces only from reliable signals (races, benchmarks, tempo
  close to target, consistent pattern across 3+ sessions). Ignore easy / hot
  / trail / social runs.

## 8. System architecture
Core modules:
1. Profile Service
2. Plan Generator
3. Pace Engine
4. Calendar Sync Service (Google OAuth)
5. Strava Sync Service
6. Rules / Adaptation Engine
7. Local Storage Layer (SQLite preferred; in this repo, Supabase or
   in-memory to start)

Recommended stack (original blueprint): Python + SQLite. **This repo uses
TypeScript** so the engine lives under `lib/runna/` and stays framework-free.

## 9. Data model
See `lib/runna/types.ts` for the concrete TypeScript schema. JSON examples:

```json
{
  "runner_profile": {
    "id": "runner_001",
    "level": "returning_runner",
    "running_ability": "intermediate",
    "goal_type": "race",
    "goal_distance": "half_marathon",
    "race_date": "2026-09-20",
    "current_weekly_distance_km": 18,
    "longest_recent_run_km": 9,
    "recent_race_times": { "5k_seconds": 1560, "10k_seconds": 3360 },
    "available_days": ["Tue", "Thu", "Sun"],
    "preferred_long_run_day": "Sun",
    "runs_per_week": 3,
    "training_volume": "steady",
    "difficulty": "balanced",
    "guidance_mode": "pace"
  }
}
```

## 10. Plan-generation pseudocode
```
generate_plan(profile):
  template = select_template(goal, level)
  total_weeks = weeks_between(start, end)
  baseline = calibrate_baseline(current_mileage, longest_run, ability,
                                runs_per_week, total_weeks)
  weekly_targets = build_progression(baseline, total_weeks, volume,
                                     difficulty, deloads=True, taper=race)
  for week in 1..total_weeks:
    mix = choose_workout_mix(goal, level, runs_per_week, week_type,
                             difficulty)
    workouts = assign_to_days(available_days, long_run_day, mix)
    allocate_distances(workouts, weekly_targets[week], longest_run, level,
                       style)
    for w in workouts:
      w.targets = pace_engine(profile, w)
```

## 11. Pace pseudocode
```
pace_engine(profile, workout):
  if profile.guidance_mode == "effort"
     or profile.level in ["beginner", "returning_runner"]:
    return effort_targets(workout.type)
  anchor = fitness_anchor(profile)
  score = performance_score(anchor)           # VDOT-like
  base = training_paces(score)
  switch workout.type:
    easy/recovery/long -> band from base
    tempo/intervals -> band adjusted for rep length
    race_pace -> event-specific
```

## 12. Sample patterns
- **Beginner 2/wk light:** easy or run/walk + longer easy. Every 3–4 weeks
  lighter. RPE-only targets.
- **Returning 3/wk light:** easy+strides or mild tempo, easy recovery, long
  easy. Effort-led first few weeks, optional pace targets later.
- **Intermediate 3/wk aggressive:** intervals/tempo, easy+strides, long with
  race-pace finishes. Narrow pace targets updated from benchmarks.

## 13. MVP scope
Ship first: onboarding form, 8–20 week plans, 2- and 3-run/week, beginner +
returning + intermediate, habit + 5K + 10K + HM + M, light/balanced/aggressive,
pace or effort, Google Calendar create/update, Strava import + matching,
pace updates from benchmarks, plan export (JSON + Markdown).

Defer: mobile UI, full watch support, social, dashboards, AI chat coach.

## 14. Roadmap
- **Phase 1 (logic core):** schema, onboarding parse, templates, progression,
  pace engine.
- **Phase 2 (local usability):** CLI / simple web UI, JSON storage, Markdown
  export, editable preferences.
- **Phase 3 (integrations):** Google Calendar, Strava OAuth + import,
  matching.
- **Phase 4 (adaptation):** pace updates from benchmarks, missed-workout
  detection, intelligent reschedule, progression suggestions.
- **Phase 5 (polish):** NL explanations, race-specific recommendations,
  richer LLM summaries.

## 15. LLM prompt templates
### Generate plan
```
You are a running-plan engine.
Generate a structured training plan from the profile JSON.
- respect runs_per_week exactly
- preserve preferred weekdays
- use effort-based guidance for beginner or returning runners unless race
  data is strong
- include deload weeks every 3–5 weeks
- return valid JSON workout objects with title, date, type, structure,
  estimated_duration, target
- use conservative progression when style=light, faster when style=aggressive
- never spike weekly distance or long-run distance
```

### Recalculate paces after Strava
```
You are a pacing-adjustment engine.
Given profile, plan, and imported Strava activities:
- identify reliable fitness signals
- ignore noisy easy/recovery/terrain-distorted efforts
- estimate too-easy / too-hard / about right
- update estimated current race times in small increments
- regenerate future targets without touching completed workouts
- explain every change in plain English
```

### Sync to Google Calendar
```
You are a calendar-sync engine.
Take plan JSON and calendar preferences, produce exact event operations:
- create events for unsynced workouts
- update events whose date/time/description changed
- preserve preferred weekdays
- include reminders, workout details, estimated duration
- if moving onto a day with an existing run, swap or warn per policy
Return operations as structured JSON.
```

## 16. Unknowns
- Runna's exact pace-band formula — not public. Use a transparent VDOT-like
  model.
- Exact plan-template library — start with a smaller template matrix.
- Exact adaptation thresholds — start simple.

## 17. Better-than-Runna goals
- Explainable calculations (why the mileage is this, why paces changed).
- Pace and mileage as separate engines (Runna's docs already separate them).
- Effort-first for beginners and returners.
- Calendar as a first-class planning surface, not just export.
- Strava as evidence, not authority — no jerky pace changes after a single
  run.

## 18. Stack in this repo
TypeScript (the host project is Next.js 16 + Supabase). The engine is pure
TypeScript under `lib/runna/` with no framework dependencies, so it can be
consumed by a web route, a CLI, or a test harness.
