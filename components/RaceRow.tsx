'use client';

import { useState } from 'react';
import { Race, formatDate, isPast } from '@/lib/types';
import PBBar from './PBBar';
import NamePill from './NamePill';
import ActionBtn from './ActionBtn';
import AdminDotsMenu from './AdminDotsMenu';

interface RaceRowProps {
  race: Race;
  wishlistNames: string[];
  signupNames: string[];
  cantdoNames: string[];
  currentUser: string;
  isAdmin: boolean;
  onToggleWishlist: (raceId: number) => void;
  onToggleSignup: (raceId: number) => void;
  onToggleCantdo: (raceId: number) => void;
  onEdit: (race: Race) => void;
  onDelete: (race: Race) => void;
}

export default function RaceRow({
  race, wishlistNames, signupNames, cantdoNames, currentUser,
  isAdmin, onToggleWishlist, onToggleSignup, onToggleCantdo, onEdit, onDelete,
}: RaceRowProps) {
  const [expanded, setExpanded] = useState(false);
  const past = isPast(race);
  const userInWL = wishlistNames.includes(currentUser);
  const userInSU = signupNames.includes(currentUser);
  const userInCD = cantdoNames.includes(currentUser);

  const allPills = [
    ...wishlistNames.map(n => ({ name: n, type: 'wishlist' as const })),
    ...signupNames.filter(n => !wishlistNames.includes(n)).map(n => ({ name: n, type: 'signup' as const })),
  ];
  // Deduplicate: if someone is in both, show signup style
  const pillMap = new Map<string, 'wishlist' | 'signup'>();
  for (const p of allPills) {
    if (!pillMap.has(p.name) || p.type === 'signup') {
      pillMap.set(p.name, p.type);
    }
  }
  const uniquePills = Array.from(pillMap.entries()).map(([name, type]) => ({ name, type }));
  const maxShow = 3;
  const visiblePills = uniquePills.slice(0, maxShow);
  const overflow = uniquePills.length - maxShow;

  return (
    <div style={{
      background: '#161b22',
      border: `1px solid ${expanded ? '#2d4a6e' : '#21262d'}`,
      borderRadius: 8,
      transition: 'border-color 0.15s',
    }}>
      {/* Collapsed row */}
      <div
        className="race-row-inner"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', cursor: 'pointer',
          opacity: past ? 0.55 : 1,
        }}
      >
        {/* Race name */}
        <div style={{
          flex: 1, minWidth: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 17, letterSpacing: 0.5,
          color: '#e6edf3',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {race.name}
        </div>

        {/* City, Country */}
        <div className="race-location" style={{
          width: 120, flexShrink: 0,
          fontSize: 12, color: '#6e7681',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {[race.city, race.country].filter(Boolean).join(', ')}
        </div>

        {/* Date */}
        <div className="race-date" style={{
          width: 96, flexShrink: 0, textAlign: 'right',
          fontSize: 12, color: past ? '#6e7681' : '#8b949e',
          fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap',
        }}>
          {formatDate(race)}
        </div>

        {/* PB bar */}
        <div className="race-pb" style={{ width: 72, flexShrink: 0 }}>
          <PBBar score={race.pb_score} variant="mini" />
        </div>

        {/* Name pills */}
        <div className="race-pills" style={{
          display: 'flex', gap: 3, alignItems: 'center',
          overflow: 'hidden', minWidth: 0, flexShrink: 0, maxWidth: 140,
        }}>
          {visiblePills.map(p => (
            <NamePill key={p.name} name={p.name} type={p.type} isCurrentUser={p.name === currentUser} />
          ))}
          {overflow > 0 && (
            <span style={{ fontSize: 10, color: '#6e7681', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
              +{overflow}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <ActionBtn type="wishlist" active={userInWL} onClick={e => { e.stopPropagation(); onToggleWishlist(race.id); }} />
        <ActionBtn type="signup" active={userInSU} onClick={e => { e.stopPropagation(); onToggleSignup(race.id); }} />
        <ActionBtn type="cantdo" active={userInCD} onClick={e => { e.stopPropagation(); onToggleCantdo(race.id); }} />

        {/* Chevron */}
        <span style={{
          fontSize: 12, color: '#6e7681',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          &#9660;
        </span>

        {/* Admin dots */}
        {isAdmin && (
          <AdminDotsMenu
            onEdit={() => onEdit(race)}
            onDelete={() => onDelete(race)}
          />
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: '1px solid #21262d',
          marginTop: 0,
        }}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Location + course type */}
            <div style={{ fontSize: 13, color: '#8b949e', fontFamily: 'var(--font-body)' }}>
              {[race.city, race.country].filter(Boolean).join(', ')}
              {race.course_type && <span style={{ color: '#6e7681' }}> &bull; {race.course_type}</span>}
            </div>

            {/* PB bar full */}
            <PBBar score={race.pb_score} variant="full" />

            {/* Weather */}
            {race.weather && (
              <div style={{ fontSize: 13, color: '#8b949e', fontFamily: 'var(--font-body)' }}>
                <span style={{ marginRight: 6 }}>&#x1F321;&#xFE0F;</span>{race.weather}
              </div>
            )}

            {/* Notes */}
            {race.notes && (
              <p style={{
                fontSize: 13, color: '#8b949e', fontFamily: 'var(--font-body)',
                fontWeight: 300, lineHeight: 1.6, margin: 0,
              }}>
                {race.notes}
              </p>
            )}

            {/* URL */}
            {race.url && (
              <a
                href={race.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: 13, color: '#7eb8f7', fontFamily: 'var(--font-body)',
                  textDecoration: 'none',
                }}
              >
                {race.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} &#x2197;
              </a>
            )}

            {/* Who's interested */}
            {(wishlistNames.length > 0 || signupNames.length > 0 || cantdoNames.length > 0) && (
              <div style={{
                marginTop: 6, padding: '10px 12px',
                background: '#0d1117', borderRadius: 8,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {wishlistNames.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#6e7681', fontFamily: 'var(--font-body)', marginRight: 2 }}>
                      &#x2B50; Wish list
                    </span>
                    {wishlistNames.map(n => (
                      <NamePill key={n} name={n} type="wishlist" isCurrentUser={n === currentUser} />
                    ))}
                  </div>
                )}
                {signupNames.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#6e7681', fontFamily: 'var(--font-body)', marginRight: 2 }}>
                      &#x2705; Signed up
                    </span>
                    {signupNames.map(n => (
                      <NamePill key={n} name={n} type="signup" isCurrentUser={n === currentUser} />
                    ))}
                  </div>
                )}
                {cantdoNames.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#6e7681', fontFamily: 'var(--font-body)', marginRight: 2 }}>
                      &#x274C; Can&apos;t do
                    </span>
                    {cantdoNames.map(n => (
                      <NamePill key={n} name={n} type="cantdo" isCurrentUser={n === currentUser} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
