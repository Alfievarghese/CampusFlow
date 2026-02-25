'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { CalendarDays, Clock, MapPin, User, Users, Globe, Lock } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: string;
  inviteType: string;
  status: string;
  posterUrl?: string;
  hall: { name: string; capacity: number };
  creator: { name: string };
  _count: { rsvps: number };
}

const CATEGORIES = ['All', 'Academic', 'Cultural', 'Sports', 'Technical', 'Workshop', 'Social', 'Other'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (category !== 'All') params.category = category;
        if (search) params.search = search;
        const res = await api.get('/events', { params });
        setEvents(res.data);
      } catch { }
      setLoading(false);
    };
    const timer = setTimeout(fetchEvents, 200);
    return () => clearTimeout(timer);
  }, [category, search]);

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>
      {/* NAVBAR */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(10,12,16,0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="sidebar-logo-mark">CF</div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>CampusFlow</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a href="#events" className="btn btn-ghost btn-sm">Events</a>
            <Link href="/auth/login" className="btn btn-secondary btn-sm">Admin Login</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-content">
          <div className="anim-fade" style={{ maxWidth: '660px' }}>
            <div className="hero-eyebrow">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)' }} />
              Live Campus Events Platform
            </div>
            <h1 style={{ marginBottom: '1.25rem' }}>
              Your College,<br />
              <em>All In One Place.</em>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.7 }}>
              Discover events, book halls, and stay connected with everything happening on campus. Powered by CampusFlow.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="#events" className="btn btn-primary btn-lg">Browse Events</a>
              <Link href="/auth/register" className="btn btn-secondary btn-lg">Host an Event →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* EVENT DISCOVERY */}
      <section id="events" style={{ padding: '5rem 0', background: 'var(--ink-2)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
            <div>
              <h2 className="anim-slide-up" style={{ marginBottom: '0.5rem' }}>Upcoming Events</h2>
              <p className="text-secondary anim-slide-up anim-delay-1">{events.length} events scheduled across campus</p>
            </div>
            {/* Search */}
            <input
              className="form-input"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
              <CalendarDays size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.4, display: 'block' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No Events Found</h3>
              <p>Check back later or try a different filter.</p>
            </div>
          ) : (
            <div className="grid-3">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', marginTop: 0 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="sidebar-logo-mark" style={{ width: 28, height: 28, fontSize: '0.85rem' }}>CF</div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>CampusFlow © 2026</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>College Event & Hall Booking Infrastructure</p>
        </div>
      </footer>
    </div>
  );
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const [showRsvp, setShowRsvp] = useState(false);
  const [showInviteReq, setShowInviteReq] = useState(false);
  const [rsvpForm, setRsvpForm] = useState({ name: '', email: '', status: 'GOING' });
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', info: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRsvp = async () => {
    if (!rsvpForm.name || !rsvpForm.email) return setMsg('Name and email required');
    setLoading(true);
    try {
      await api.post('/rsvp', { eventId: event.id, userIdentifier: rsvpForm.email, userName: rsvpForm.name, status: rsvpForm.status });
      setMsg('✓ RSVP submitted!');
    } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    setLoading(false);
  };

  const submitInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return setMsg('Name and email required');
    setLoading(true);
    try {
      await api.post('/invites/request', { eventId: event.id, requesterName: inviteForm.name, requesterEmail: inviteForm.email, requesterInfo: inviteForm.info });
      setMsg('✓ Invite requested!');
    } catch (e: any) { setMsg(e.response?.data?.error || 'Already requested'); }
    setLoading(false);
  };

  return (
    <div className={`event-card anim-slide-up anim-delay-${Math.min(index + 1, 5)}`}>
      {event.posterUrl ? (
        <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${event.posterUrl}`} alt={event.title} className="event-card-img" />
      ) : (
        <div className="event-card-img-placeholder">
          {event.category[0]}
        </div>
      )}
      <div className="event-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="event-card-category">{event.category}</span>
          <span className={`badge ${event.inviteType === 'PUBLIC' ? 'badge-public' : 'badge-invite'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            {event.inviteType === 'PUBLIC' ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Invite Only</>}
          </span>
        </div>
        <div className="event-card-title">{event.title}</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.description.slice(0, 100)}{event.description.length > 100 ? '...' : ''}</p>
        <div className="divider" />
        <div className="event-card-meta">
          <div className="event-card-detail">
            <CalendarDays size={13} />{formatDate(event.startTime)}
          </div>
          <div className="event-card-detail">
            <Clock size={13} />{formatTime(event.startTime)} – {formatTime(event.endTime)}
          </div>
          <div className="event-card-detail">
            <MapPin size={13} />{event.hall.name}
          </div>
          <div className="event-card-detail">
            <User size={13} />{event.creator.name}
          </div>
          <div className="event-card-detail">
            <Users size={13} />{event._count.rsvps} RSVPs
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          {event.inviteType === 'PUBLIC' ? (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setShowRsvp(!showRsvp); setMsg(''); }}>
              {showRsvp ? 'Cancel' : '+ RSVP'}
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setShowInviteReq(!showInviteReq); setMsg(''); }}>
              {showInviteReq ? 'Cancel' : <><Lock size={12} style={{ marginRight: 4 }} />Request Invite</>}
            </button>
          )}
        </div>

        {/* RSVP form */}
        {showRsvp && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
            <input className="form-input" placeholder="Your name" value={rsvpForm.name} onChange={e => setRsvpForm(p => ({ ...p, name: e.target.value }))} />
            <input className="form-input" placeholder="Email" type="email" value={rsvpForm.email} onChange={e => setRsvpForm(p => ({ ...p, email: e.target.value }))} />
            <select className="form-select" value={rsvpForm.status} onChange={e => setRsvpForm(p => ({ ...p, status: e.target.value }))}>
              <option value="GOING">Going</option>
              <option value="INTERESTED">Interested</option>
            </select>
            <button className="btn btn-primary btn-sm btn-full" onClick={submitRsvp} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </div>
        )}

        {/* Invite request form */}
        {showInviteReq && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
            <input className="form-input" placeholder="Your name" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} />
            <input className="form-input" placeholder="Email" type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            <textarea className="form-textarea" placeholder="Why do you want to attend?" value={inviteForm.info} onChange={e => setInviteForm(p => ({ ...p, info: e.target.value }))} rows={3} />
            <button className="btn btn-secondary btn-sm btn-full" onClick={submitInvite} disabled={loading}>
              {loading ? 'Submitting...' : 'Request Invite'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
