'use client';

import { useState } from 'react';

interface AdminModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminModal({ onSuccess, onClose }: AdminModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);

    try {
      const res = await fetch('/api/admin-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();

      if (data.ok) {
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    } catch {
      setError(true);
      setPin('');
    }
    setChecking(false);
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
          borderRadius: 12, padding: 28, width: '100%', maxWidth: 340,
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 26,
          color: '#e6edf3', letterSpacing: 1, marginBottom: 8,
        }}>
          Admin PIN
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 300,
          color: '#8b949e', marginBottom: 20,
        }}>
          Enter the admin PIN to manage races.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false); }}
            placeholder="PIN"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: '#0d1117',
              border: `1px solid ${error ? '#eb5757' : '#21262d'}`,
              color: '#e6edf3', fontSize: 15, fontFamily: 'var(--font-body)',
              outline: 'none', marginBottom: error ? 8 : 16,
            }}
          />
          {error && (
            <p style={{ color: '#eb5757', fontSize: 12, fontFamily: 'var(--font-body)', marginBottom: 12 }}>
              Incorrect PIN
            </p>
          )}
          <button
            type="submit"
            disabled={checking}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: '#1f6feb', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
              cursor: 'pointer', opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
