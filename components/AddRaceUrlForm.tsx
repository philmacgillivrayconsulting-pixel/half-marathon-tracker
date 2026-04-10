'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AddRaceUrlFormProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddRaceUrlForm({ onClose, onSaved }: AddRaceUrlFormProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setSaving(true);

    // Use the name if provided, otherwise extract something from the URL
    const raceName = name.trim() || new URL(trimmedUrl).hostname.replace('www.', '');

    await supabase.from('races').insert({
      name: raceName,
      url: trimmedUrl,
      course_type: 'Flat',
      pb_score: 7,
    });

    setSaving(false);
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: '#0d1117', border: '1px solid #21262d',
    color: '#e6edf3', fontSize: 15, fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#161b22', border: '1px solid #2d4a6e',
          borderRadius: 12, padding: 28, width: '100%', maxWidth: 420,
        }}
      >
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
          Paste the race website URL and give it a name.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{
              fontSize: 12, color: '#8b949e', fontFamily: 'var(--font-body)',
              fontWeight: 500, marginBottom: 4, display: 'block',
            }}>
              Race URL *
            </label>
            <input
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.racewebsite.com"
              type="url"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2d4a6e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#21262d'; }}
            />
          </div>
          <div>
            <label style={{
              fontSize: 12, color: '#8b949e', fontFamily: 'var(--font-body)',
              fontWeight: 500, marginBottom: 4, display: 'block',
            }}>
              Race name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Berlin Half Marathon"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#2d4a6e'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#21262d'; }}
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
              disabled={saving || !url.trim()}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8,
                background: url.trim() ? '#2ea043' : '#21262d',
                color: url.trim() ? '#fff' : '#6e7681',
                border: 'none', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)',
                cursor: url.trim() ? 'pointer' : 'default',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Adding...' : 'Add Race'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
