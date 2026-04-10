'use client';

import { useState } from 'react';
import { Race, MONTHS } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AddRaceFormProps {
  race?: Race | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddRaceForm({ race, onClose, onSaved }: AddRaceFormProps) {
  const [form, setForm] = useState({
    name: race?.name || '',
    city: race?.city || '',
    country: race?.country || '',
    race_day: race?.race_day?.toString() || '',
    race_month: race?.race_month || '',
    race_year: race?.race_year?.toString() || '',
    course_type: race?.course_type || 'Flat',
    pb_score: race?.pb_score ?? 7,
    weather: race?.weather || '',
    url: race?.url || '',
    notes: race?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      race_day: form.race_day ? parseInt(form.race_day) : null,
      race_month: form.race_month || null,
      race_year: form.race_year ? parseInt(form.race_year) : null,
      course_type: form.course_type,
      pb_score: form.pb_score,
      weather: form.weather.trim() || null,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (race) {
      await supabase.from('races').update(payload).eq('id', race.id);
    } else {
      await supabase.from('races').insert(payload);
    }

    setSaving(false);
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
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
          borderRadius: 12, padding: 28, width: '100%', maxWidth: 480,
          marginTop: 40, marginBottom: 40,
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 26,
          color: '#e6edf3', letterSpacing: 1, marginBottom: 20,
        }}>
          {race ? 'Edit Race' : 'Add Race'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Race name *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Day</label>
              <input style={inputStyle} type="number" min={1} max={31} value={form.race_day} onChange={e => set('race_day', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Month</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.race_month}
                onChange={e => set('race_month', e.target.value)}
              >
                <option value="">--</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Year</label>
              <input style={inputStyle} type="number" min={2024} max={2035} value={form.race_year} onChange={e => set('race_year', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Course type</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.course_type}
                onChange={e => set('course_type', e.target.value)}
              >
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
                style={{ width: '100%', marginTop: 8, accentColor: '#1f6feb' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Weather</label>
            <input style={inputStyle} value={form.weather} onChange={e => set('weather', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Website URL</label>
            <input style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
              disabled={saving || !form.name.trim()}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                background: '#1f6feb', color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
                cursor: 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : race ? 'Update' : 'Add Race'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
