'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get('/events/' + id)
      .then(r => setEvent(r.data))
      .catch(() => setError('Event not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;
  if (error || !event) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--ink)' }}><p style={{ color: 'var(--text-secondary)' }}>{error}</p><Link href="/" className="btn btn-secondary">Back</Link></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>← All Events</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginTop: '1.5rem', color: 'var(--text-primary)' }}>{event.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.7 }}>{event.description}</p>
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div>📅 {new Date(event.startTime).toLocaleString('en-IN')}</div>
            <div>🏢 {event.hall?.name} — {event.hall?.location}</div>
            <div>👤 Hosted by {event.creator?.name}</div>
            <div>👥 {event._count?.rsvps || 0} RSVPs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
