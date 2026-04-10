'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MONTHS } from '@/lib/types';

interface AddRaceUrlFormProps {
  onClose: () => void;
  onSaved: () => void;
}

type Step = 'url' | 'scraping' | 'review';

export default function AddRaceUrlForm({ onClose, onSaved }: AddRaceUrlFormProps) {
  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [scrapeError, setScrapeError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields (populated by scrape, editable by user)
  const [form, setForm] = useState({
    name: '',
    city: '',
    country: '',
    race_day: '',
    race_month: '',
    race_year: '',
    course_type: 'Flat',
    pb_score: 7,
    weather: '',
    notes: '',
  });

  const set = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }));

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setStep('scraping');
    setScrapeError('');

    try {
      const res = await fetch('/api/scrape-race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScrapeError(data.error || 'Failed to scrape');
        setStep('review'); // Still show form so they can fill manually
        return;
      }

      setForm({
        name: data.name || '',
        city: data.city || '',
        country: data.country || '',
        race_day: data.race_day?.toString() || '',
        race_month: data.race_month || '',
        race_year: data.race_year?.toString() || '',
        course_type: 'Flat',
        pb_score: 7,
        weather: '',
        notes: data.notes || '',
      });
      setStep('review');
    } catch {
      setScrapeError('Could not reach the URL. Fill in the details manually.');
      setStep('review');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    await supabase.from('races').insert({
      name: form.name.trim(),
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      race_day: form.race_day ? parseInt(form.race_day) : null,
      race_month: form.race_month || null,
      race_year: form.race_year ? parseInt(form.race_year) : null,
      course_type: form.course_type,
      pb_score: form.pb_score,
      weather: form.weather.trim() || null,
      url: url.trim(),
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: '#0d1117', border: '1px solid #21262d',
    color: '#e6edf3', fontSize: 14, fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#8b949e', fontFamily: 'var(--font-body)',
    fontWeight: 500, marginBottom: 4, display: 'block',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#161b22', border: '1px solid #2d4a6e',
          borderRadius: 12, padding: 28, width: '100%',
          maxWidth: step === 'url' ? 420 : 480,
          marginTop: 40, marginBottom: 40,
          transition: 'max-width 0.2s',
        }}
      >
        {/* Step 1: URL input */}
        {step === 'url' && (
          <>
            <h2 style={{
              fontFamily: 'var(--font-heading)', fontSize: 26,
              color: '#e6edf3', letterSpacing: 1, marginBottom: 8,
            }}>
              Add a Race
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 300,
              color: '#8b949e', marginBottom: 20, lineHeight: 1.5,
            }}>
              Paste the race website URL and we&apos;ll pull in the details.
            </p>
            <form onSubmit={handleScrape} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                autoFocus
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.racewebsite.com"
                type="url"
                style={{ ...inputStyle, fontSize: 15 }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2d4a6e'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#21262d'; }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: '#21262d', color: '#8b949e', border: 'none',
                    fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: url.trim() ? '#2ea043' : '#21262d',
                    color: url.trim() ? '#fff' : '#6e7681',
                    border: 'none', fontSize: 14, fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    cursor: url.trim() ? 'pointer' : 'default',
                  }}
                >
                  Fetch Details
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: Scraping spinner */}
        {step === 'scraping' && (
          <div style={{
            textAlign: 'center', padding: '30px 0',
          }}>
            <div style={{
              fontSize: 28, marginBottom: 14, animation: 'spin 1s linear infinite',
            }}>
              &#x1F50D;
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: '#8b949e', fontWeight: 300,
            }}>
              Fetching race details...
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Step 3: Review & edit form */}
        {step === 'review' && (
          <>
            <h2 style={{
              fontFamily: 'var(--font-heading)', fontSize: 26,
              color: '#e6edf3', letterSpacing: 1, marginBottom: 4,
            }}>
              Review Details
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300,
              color: '#6e7681', marginBottom: 16,
            }}>
              {scrapeError
                ? scrapeError
                : 'We pulled what we could. Edit anything that needs fixing.'}
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Race name *</label>
                <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Day</label>
                  <input style={inputStyle} type="number" min={1} max={31} value={form.race_day} onChange={e => set('race_day', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Month</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.race_month} onChange={e => set('race_month', e.target.value)}>
                    <option value="">--</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input style={inputStyle} type="number" min={2024} max={2035} value={form.race_year} onChange={e => set('race_year', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Course type</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.course_type} onChange={e => set('course_type', e.target.value)}>
                    {['Flat', 'Undulating', 'Hilly', 'Mixed'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>PB score ({form.pb_score}/10)</label>
                  <input
                    type="range" min={1} max={10} value={form.pb_score}
                    onChange={e => set('pb_score', parseInt(e.target.value))}
                    style={{ width: '100%', marginTop: 8, accentColor: '#2ea043' }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Weather</label>
                <input style={inputStyle} value={form.weather} onChange={e => set('weather', e.target.value)} placeholder="e.g. ~15-20°C, mild and sunny" />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>

              <div style={{
                fontSize: 12, color: '#6e7681', fontFamily: 'var(--font-body)',
                padding: '6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                &#x1F517; {url}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setStep('url'); setScrapeError(''); }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: '#21262d', color: '#8b949e', border: 'none',
                    fontSize: 14, fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    background: form.name.trim() ? '#2ea043' : '#21262d',
                    color: form.name.trim() ? '#fff' : '#6e7681',
                    border: 'none', fontSize: 14, fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    cursor: form.name.trim() ? 'pointer' : 'default',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Adding...' : 'Add Race'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
