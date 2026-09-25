'use client';

import {useEffect, useState} from 'react';

const ELECTION_DATE = new Date('2027-01-16T08:00:00+01:00').getTime();

function getRemaining() {
  const difference = Math.max(0, ELECTION_DATE - Date.now());
  return {
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference / 3600000) % 24),
    minutes: Math.floor((difference / 60000) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    complete: difference === 0,
  };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function ElectionCountdown() {
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    setRemaining(getRemaining());
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="election-countdown" aria-label="Countdown to the 2027 general election">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[var(--accent)]">2027 election cycle</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Countdown to election day · 16 January 2027, 8:00 AM WAT</p>
        </div>
        {remaining?.complete ? (
          <p className="text-sm font-bold text-[var(--accent)]">Election day has arrived.</p>
        ) : (
          <div className="countdown-grid" role="timer" aria-label="Time remaining until 16 January 2027 at 8 AM West Africa Time">
            {[['days', remaining?.days ?? 0], ['hours', remaining?.hours ?? 0], ['minutes', remaining?.minutes ?? 0], ['seconds', remaining?.seconds ?? 0]].map(([label, value]) => (
              <div key={label} className="countdown-unit">
                <strong>{label === 'days' ? value : pad(Number(value))}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
