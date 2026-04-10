'use client';

import { useState, useRef, useEffect } from 'react';

interface AdminDotsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export default function AdminDotsMenu({ onEdit, onDelete }: AdminDotsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{
          background: 'none', border: 'none', color: '#6e7681',
          cursor: 'pointer', fontSize: 16, padding: '4px 6px',
          fontFamily: 'var(--font-body)',
        }}
        title="More actions"
      >
        &middot;&middot;&middot;
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100,
          background: '#161b22', border: '1px solid #2d4a6e',
          borderRadius: 8, overflow: 'hidden', minWidth: 120,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
            style={{
              display: 'block', width: '100%', padding: '10px 14px',
              background: 'none', border: 'none', color: '#e6edf3',
              fontSize: 13, fontFamily: 'var(--font-body)', textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#21262d'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
            style={{
              display: 'block', width: '100%', padding: '10px 14px',
              background: 'none', border: 'none', color: '#eb5757',
              fontSize: 13, fontFamily: 'var(--font-body)', textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#21262d'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
