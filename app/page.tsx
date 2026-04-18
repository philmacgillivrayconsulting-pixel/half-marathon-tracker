'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { Race, Wishlist, Signup, CantDo, isPast, raceSortDate } from '@/lib/types';
import RaceRow from '@/components/RaceRow';
import NameModal from '@/components/NameModal';
import AdminModal from '@/components/AdminModal';
import AddRaceForm from '@/components/AddRaceForm';
import AddRaceUrlForm from '@/components/AddRaceUrlForm';
import Link from 'next/link';

type Tab = 'all' | 'wishlist' | 'signup' | 'cantdo' | 'past';
type SortMode = 'date-asc' | 'date-desc' | 'pb-desc' | 'name-asc';

export default function Home() {
  const [races, setRaces] = useState<Race[]>([]);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [cantdos, setCantdos] = useState<CantDo[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<SortMode>('date-asc');
  const [filterPerson, setFilterPerson] = useState<string>('everyone');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'wl' | 'su' | 'cd'; raceId: number } | null>(null);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load user name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('hm_user_name');
    if (stored) setUserName(stored);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!supabaseConfigured) { setLoaded(true); return; }
    const [rRes, wRes, sRes, cRes] = await Promise.all([
      supabase.from('races').select('*'),
      supabase.from('wishlists').select('*'),
      supabase.from('signups').select('*'),
      supabase.from('cantdo').select('*'),
    ]);
    if (rRes.data) setRaces(rRes.data);
    if (wRes.data) setWishlists(wRes.data);
    if (sRes.data) setSignups(sRes.data);
    if (cRes.data) setCantdos(cRes.data);
    setLoaded(true);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('tracker-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlists' }, () => {
        supabase.from('wishlists').select('*').then(r => { if (r.data) setWishlists(r.data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signups' }, () => {
        supabase.from('signups').select('*').then(r => { if (r.data) setSignups(r.data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cantdo' }, () => {
        supabase.from('cantdo').select('*').then(r => { if (r.data) setCantdos(r.data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Build maps
  const wlMap = useMemo(() => {
    const m: Record<number, string[]> = {};
    for (const w of wishlists) {
      if (!m[w.race_id]) m[w.race_id] = [];
      m[w.race_id].push(w.user_name);
    }
    return m;
  }, [wishlists]);

  const suMap = useMemo(() => {
    const m: Record<number, string[]> = {};
    for (const s of signups) {
      if (!m[s.race_id]) m[s.race_id] = [];
      m[s.race_id].push(s.user_name);
    }
    return m;
  }, [signups]);

  const cdMap = useMemo(() => {
    const m: Record<number, string[]> = {};
    for (const c of cantdos) {
      if (!m[c.race_id]) m[c.race_id] = [];
      m[c.race_id].push(c.user_name);
    }
    return m;
  }, [cantdos]);

  const saveName = (name: string) => {
    setUserName(name);
    localStorage.setItem('hm_user_name', name);
    setShowNameModal(false);

    if (pendingAction) {
      const { type, raceId } = pendingAction;
      setPendingAction(null);
      if (type === 'wl') doToggleWishlist(raceId, name);
      else if (type === 'su') doToggleSignup(raceId, name);
      else doToggleCantdo(raceId, name);
    }
  };

  const doToggleWishlist = async (raceId: number, name: string) => {
    const existing = wishlists.find(w => w.race_id === raceId && w.user_name === name);
    if (existing) {
      await supabase.from('wishlists').delete().eq('id', existing.id);
      setWishlists(ws => ws.filter(w => w.id !== existing.id));
    } else {
      const { data } = await supabase.from('wishlists').insert({ race_id: raceId, user_name: name }).select().single();
      if (data) setWishlists(ws => [...ws, data]);
    }
  };

  const doToggleSignup = async (raceId: number, name: string) => {
    const existing = signups.find(s => s.race_id === raceId && s.user_name === name);
    if (existing) {
      await supabase.from('signups').delete().eq('id', existing.id);
      setSignups(ss => ss.filter(s => s.id !== existing.id));
    } else {
      const { data } = await supabase.from('signups').insert({ race_id: raceId, user_name: name }).select().single();
      if (data) setSignups(ss => [...ss, data]);
    }
  };

  const handleToggleWishlist = (raceId: number) => {
    if (!userName) {
      setPendingAction({ type: 'wl', raceId });
      setShowNameModal(true);
      return;
    }
    doToggleWishlist(raceId, userName);
  };

  const handleToggleSignup = (raceId: number) => {
    if (!userName) {
      setPendingAction({ type: 'su', raceId });
      setShowNameModal(true);
      return;
    }
    doToggleSignup(raceId, userName);
  };

  const doToggleCantdo = async (raceId: number, name: string) => {
    const existing = cantdos.find(c => c.race_id === raceId && c.user_name === name);
    if (existing) {
      await supabase.from('cantdo').delete().eq('id', existing.id);
      setCantdos(cs => cs.filter(c => c.id !== existing.id));
    } else {
      const { data } = await supabase.from('cantdo').insert({ race_id: raceId, user_name: name }).select().single();
      if (data) setCantdos(cs => [...cs, data]);
    }
  };

  const handleToggleCantdo = (raceId: number) => {
    if (!userName) {
      setPendingAction({ type: 'cd', raceId });
      setShowNameModal(true);
      return;
    }
    doToggleCantdo(raceId, userName);
  };

  const handleDeleteRace = async (race: Race) => {
    if (!confirm(`Delete "${race.name}"?`)) return;
    await supabase.from('races').delete().eq('id', race.id);
    setRaces(rs => rs.filter(r => r.id !== race.id));
  };

  const handleEditRace = (race: Race) => {
    setEditingRace(race);
    setShowRaceForm(true);
  };

  const handleRaceSaved = () => {
    setShowRaceForm(false);
    setEditingRace(null);
    fetchData();
  };

  // Filter + sort races
  const upcomingRaces = useMemo(() => races.filter(r => !isPast(r)), [races]);

  const filteredRaces = useMemo(() => {
    let list = races;

    if (tab === 'all') {
      list = list.filter(r => !isPast(r));
    } else if (tab === 'past') {
      list = list.filter(r => isPast(r));
    } else if (tab === 'wishlist') {
      list = list.filter(r => !isPast(r) && (wlMap[r.id]?.length || 0) > 0);
    } else if (tab === 'signup') {
      list = list.filter(r => !isPast(r) && (suMap[r.id]?.length || 0) > 0);
    } else if (tab === 'cantdo') {
      list = list.filter(r => !isPast(r) && (cdMap[r.id]?.length || 0) > 0);
    }

    if ((tab === 'wishlist' || tab === 'signup' || tab === 'cantdo') && filterPerson !== 'everyone') {
      if (tab === 'wishlist') {
        list = list.filter(r => wlMap[r.id]?.includes(filterPerson));
      } else if (tab === 'signup') {
        list = list.filter(r => suMap[r.id]?.includes(filterPerson));
      } else {
        list = list.filter(r => cdMap[r.id]?.includes(filterPerson));
      }
    }

    list = [...list];
    switch (sort) {
      case 'date-asc':
        list.sort((a, b) => raceSortDate(a) - raceSortDate(b));
        break;
      case 'date-desc':
        list.sort((a, b) => raceSortDate(b) - raceSortDate(a));
        break;
      case 'pb-desc':
        list.sort((a, b) => b.pb_score - a.pb_score);
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [races, tab, sort, filterPerson, wlMap, suMap, cdMap]);

  const counts = useMemo(() => ({
    all: upcomingRaces.length,
    wishlist: upcomingRaces.filter(r => (wlMap[r.id]?.length || 0) > 0).length,
    signup: upcomingRaces.filter(r => (suMap[r.id]?.length || 0) > 0).length,
    cantdo: upcomingRaces.filter(r => (cdMap[r.id]?.length || 0) > 0).length,
    past: races.filter(r => isPast(r)).length,
  }), [upcomingRaces, races, wlMap, suMap, cdMap]);

  const filterNames = useMemo(() => {
    const nameSet = new Set<string>();
    if (tab === 'wishlist') {
      upcomingRaces.forEach(r => wlMap[r.id]?.forEach(n => nameSet.add(n)));
    } else if (tab === 'signup') {
      upcomingRaces.forEach(r => suMap[r.id]?.forEach(n => nameSet.add(n)));
    } else if (tab === 'cantdo') {
      upcomingRaces.forEach(r => cdMap[r.id]?.forEach(n => nameSet.add(n)));
    }
    return Array.from(nameSet).sort();
  }, [tab, upcomingRaces, wlMap, suMap, cdMap]);

  useEffect(() => { setFilterPerson('everyone'); }, [tab]);

  const tabDef: { key: Tab; emoji: string; label: string }[] = [
    { key: 'all', emoji: '\uD83C\uDFC3', label: 'All Races' },
    { key: 'wishlist', emoji: '\u2B50', label: 'Wish List' },
    { key: 'signup', emoji: '\u2705', label: 'Signed Up' },
    { key: 'cantdo', emoji: '\u274C', label: "Can't Do" },
    { key: 'past', emoji: '\uD83C\uDFC5', label: 'Past' },
  ];

  if (!loaded) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d1117',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#6e7681', fontFamily: 'var(--font-body)', fontSize: 15,
      }}>
        Loading...
      </div>
    );
  }

  if (!supabaseConfigured) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d1117',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{
          background: '#161b22', border: '1px solid #2d4a6e', borderRadius: 12,
          padding: 32, maxWidth: 480, textAlign: 'center',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 32,
            color: '#e6edf3', letterSpacing: 1.5, marginBottom: 12,
          }}>
            Half Marathon Tracker
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 300,
            color: '#8b949e', lineHeight: 1.6,
          }}>
            Supabase is not configured yet. Add your project URL and anon key to <code style={{ color: '#7eb8f7' }}>.env.local</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117' }}>
      {/* Header */}
      <header style={{
        maxWidth: 900, margin: '0 auto', padding: '20px 16px 0',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 32, letterSpacing: 1.5,
          color: '#e6edf3', margin: 0, flex: 1,
        }}>
          Half Marathon Tracker
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/training"
            style={{
              background: 'none', border: '1px solid #21262d',
              borderRadius: 8, padding: '6px 10px',
              color: '#8b949e', fontSize: 13, fontFamily: 'var(--font-body)',
              textDecoration: 'none',
            }}
          >
            Training →
          </Link>
          {userName ? (
            <button
              onClick={() => {
                const newName = prompt('Change your name:', userName);
                if (newName?.trim()) {
                  setUserName(newName.trim());
                  localStorage.setItem('hm_user_name', newName.trim());
                }
              }}
              style={{
                background: 'none', border: '1px solid #21262d',
                borderRadius: 8, padding: '6px 10px',
                color: '#8b949e', fontSize: 13, fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              &#x1F464; {userName}
            </button>
          ) : (
            <button
              onClick={() => setShowNameModal(true)}
              style={{
                background: 'none', border: '1px dashed #21262d',
                borderRadius: 8, padding: '6px 10px',
                color: '#6e7681', fontSize: 13, fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              Add your name
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => { setEditingRace(null); setShowRaceForm(true); }}
              style={{
                background: '#1f6feb', color: '#fff', border: 'none',
                borderRadius: 8, padding: '6px 12px',
                fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              + Race
            </button>
          )}

          <button
            onClick={() => {
              if (isAdmin) setIsAdmin(false);
              else setShowAdminModal(true);
            }}
            style={{
              background: 'none', border: '1px solid #21262d',
              borderRadius: 8, padding: '6px 10px',
              color: isAdmin ? '#6fcf97' : '#6e7681',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            {isAdmin ? '\uD83D\uDD13 Admin' : '\uD83D\uDD12 Admin'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 40px' }}>
        {/* Add a Race button */}
        <button
          onClick={() => setShowAddUrl(true)}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            background: '#2ea043', color: '#fff', border: 'none',
            fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-heading)',
            letterSpacing: 1, cursor: 'pointer',
            marginBottom: 16,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3fb950'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2ea043'; }}
        >
          + Add a Race
        </button>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 12,
          borderBottom: '1px solid #21262d', paddingBottom: 0,
          overflowX: 'auto',
        }}>
          {tabDef.map(t => {
            const count = counts[t.key];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #7eb8f7' : '2px solid transparent',
                  padding: '8px 14px',
                  color: active ? '#e6edf3' : '#6e7681',
                  fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <span className="tab-emoji">{t.emoji} </span>
                {t.label}
                {count > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 11, padding: '1px 6px',
                    borderRadius: 10, background: active ? '#1f6feb' : '#21262d',
                    color: active ? '#fff' : '#8b949e',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter + sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12, flexWrap: 'wrap',
        }}>
          {(tab === 'wishlist' || tab === 'signup' || tab === 'cantdo') && filterNames.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterPerson('everyone')}
                style={{
                  padding: '4px 10px', borderRadius: 14, border: 'none',
                  fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 500,
                  cursor: 'pointer',
                  background: filterPerson === 'everyone' ? '#1f6feb' : '#21262d',
                  color: filterPerson === 'everyone' ? '#fff' : '#8b949e',
                }}
              >
                Everyone
              </button>
              {filterNames.map(name => (
                <button
                  key={name}
                  onClick={() => setFilterPerson(name)}
                  style={{
                    padding: '4px 10px', borderRadius: 14, border: 'none',
                    fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 500,
                    cursor: 'pointer',
                    background: filterPerson === name ? '#1f6feb' : '#21262d',
                    color: filterPerson === name ? '#fff' : '#8b949e',
                  }}
                >
                  {name === userName ? `${name} (me)` : name}
                </button>
              ))}
            </div>
          )}

          {(tab !== 'wishlist' && tab !== 'signup' && tab !== 'cantdo' || filterNames.length === 0) && <div style={{ flex: 1 }} />}

          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
            style={{
              background: '#161b22', border: '1px solid #21262d',
              borderRadius: 8, padding: '6px 10px',
              color: '#8b949e', fontSize: 12, fontFamily: 'var(--font-body)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="date-asc">Date (earliest)</option>
            <option value="date-desc">Date (latest)</option>
            <option value="pb-desc">PB score (highest)</option>
            <option value="name-asc">Name (A-Z)</option>
          </select>
        </div>

        {/* Race list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {filteredRaces.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: '#6e7681', fontSize: 14, fontFamily: 'var(--font-body)',
            }}>
              {tab === 'past' ? 'No past races yet.' :
               tab === 'wishlist' ? 'No races wishlisted yet.' :
               tab === 'signup' ? 'No signups yet.' :
               tab === 'cantdo' ? "No races marked as can't do." :
               'No upcoming races.'}
            </div>
          )}
          {filteredRaces.map(race => (
            <RaceRow
              key={race.id}
              race={race}
              wishlistNames={wlMap[race.id] || []}
              signupNames={suMap[race.id] || []}
              cantdoNames={cdMap[race.id] || []}
              currentUser={userName}
              isAdmin={isAdmin}
              onToggleWishlist={handleToggleWishlist}
              onToggleSignup={handleToggleSignup}
              onToggleCantdo={handleToggleCantdo}
              onEdit={handleEditRace}
              onDelete={handleDeleteRace}
            />
          ))}
        </div>
      </main>

      {showNameModal && (
        <NameModal
          onSave={saveName}
          onClose={() => { setShowNameModal(false); setPendingAction(null); }}
        />
      )}
      {showAdminModal && (
        <AdminModal
          onSuccess={() => { setIsAdmin(true); setShowAdminModal(false); }}
          onClose={() => setShowAdminModal(false)}
        />
      )}
      {showRaceForm && (
        <AddRaceForm
          race={editingRace}
          onClose={() => { setShowRaceForm(false); setEditingRace(null); }}
          onSaved={handleRaceSaved}
        />
      )}
      {showAddUrl && (
        <AddRaceUrlForm
          onClose={() => setShowAddUrl(false)}
          onSaved={() => { setShowAddUrl(false); fetchData(); }}
        />
      )}
    </div>
  );
}
