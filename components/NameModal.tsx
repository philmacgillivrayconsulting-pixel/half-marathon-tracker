'use client';

import { useState } from 'react';

interface NameModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function NameModal({ onSave, onClose }: NameModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
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
          borderRadius: 12, padding: 28, width: '100%', maxWidth: 380,
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 26,
          color: '#e6edf3', letterSpacing: 1, marginBottom: 8,
        }}>
          What&apos;s your name?
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 300,
          color: '#8b949e', marginBottom: 20,
        }}>
          This is how you&apos;ll appear on race wishlists and signups.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Phil"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: '#0d1117', border: '1px solid #21262d',
              color: '#e6edf3', fontSize: 15, fontFamily: 'var(--font-body)',
              outline: 'none', marginBottom: 16,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2d4a6e'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#21262d'; }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: name.trim() ? '#1f6feb' : '#21262d',
              color: name.trim() ? '#fff' : '#6e7681',
              border: 'none', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', cursor: name.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
