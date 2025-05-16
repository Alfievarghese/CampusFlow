'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[CampusFlow]', error); }, [error]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Something went wrong</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset} className="btn btn-primary">Try Again</button>
    </div>
  );
}
