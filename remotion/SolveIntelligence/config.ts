export const VIDEO_CONFIG = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 30 * 32,
} as const;

export const SCENES = {
  intro: {from: 0, duration: 90},
  problem: {from: 90, duration: 90},
  drafting: {from: 180, duration: 150},
  prosecution: {from: 330, duration: 150},
  charts: {from: 480, duration: 150},
  trust: {from: 630, duration: 120},
  stats: {from: 750, duration: 120},
  cta: {from: 870, duration: 90},
} as const;

export const COLORS = {
  bgDeep: '#0A0E27',
  bgMid: '#111733',
  bgLight: '#1A2247',
  accent: '#5B8DEF',
  accentBright: '#7BA7FF',
  highlight: '#A78BFA',
  cyan: '#22D3EE',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  success: '#34D399',
  panel: 'rgba(30, 41, 80, 0.85)',
  panelBorder: 'rgba(123, 167, 255, 0.25)',
} as const;

export const FONT_STACK =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
