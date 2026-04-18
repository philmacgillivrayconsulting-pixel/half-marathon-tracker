'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/components/training/OnboardingForm';
import type { RunnerProfile } from '@/lib/runna/types';

export default function OnboardingPage() {
  const router = useRouter();
  const [runnerId, setRunnerId] = useState<string>('');
  const [initial, setInitial] = useState<RunnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = typeof window !== 'undefined'
      ? localStorage.getItem('hm_user_name') ?? ''
      : '';
    if (!name) {
      setLoading(false);
      return;
    }
    setRunnerId(name);
    fetch(`/api/runna/profile?runner_id=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setInitial(d.profile ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!runnerId && !loading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)' }}>Set your name first</h2>
        <p>
          Training plans are keyed to the name you use in the race tracker.
          Open the races page and set your name, then come back here.
        </p>
      </div>
    );
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', marginTop: 0 }}>
        {initial ? 'Edit profile' : 'Get started'}
      </h2>
      <p style={{ color: '#8b949e', marginBottom: 24 }}>
        Signed in as <strong>{runnerId}</strong>. Fill this in once; you can
        come back and edit any time.
      </p>
      <OnboardingForm
        runnerId={runnerId}
        initial={initial}
        onSaved={() => router.push('/training/plan')}
      />
    </div>
  );
}
