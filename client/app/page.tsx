'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { CalendarDays, Clock, MapPin, Users, Globe, Lock, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// Dynamic import to prevent SSR issues with framer-motion
const BackgroundPaths = dynamic(() => import('@/components/BackgroundPaths'), { ssr: false });

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
  bannerUrl?: string;
  hall: { name: string; capacity: number };
  creator: { name: string };
  _count?: { rsvps: number };
}

interface BannerEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  bannerUrl: string;
  category: string;
  hall: { name: string };
}

const CATEGORIES = ['All', 'Academic', 'Cultural', 'Sports', 'Technical', 'Workshop', 'Social', 'Other'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* =============================================
   BANNER CAROUSEL — Auto-scrolling hero banners
   ============================================= */
const FALLBACK_SLIDES = [
  { title: 'Welcome to CampusFlow', subtitle: 'Your all-in-one campus event management platform', gradient: 'linear-gradient(135deg, #1a1f2e 0%, #0f3460 50%, #16213e 100%)' },
  { title: 'Host Your Next Event', subtitle: 'Book halls, manage RSVPs, and schedule events — effortlessly', gradient: 'linear-gradient(135deg, #1a1f2e 0%, #2d1b4e 50%, #1a1235 100%)' },
  { title: 'Discover What\u2019s Happening', subtitle: 'Stay connected with every event on campus', gradient: 'linear-gradient(135deg, #1a1f2e 0%, #0b3d2e 50%, #112220 100%)' },
];

function BannerCarousel() {
  const [banners, setBanners] = useState<BannerEvent[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

  useEffect(() => {
    api.get('/events/banners').then(res => setBanners(res.data)).catch(() => { });
  }, []);

  const hasBanners = banners.length > 0;
  const slideCount = hasBanners ? banners.length : FALLBACK_SLIDES.length;

  const goTo = useCallback((i: number) => setCurrent((i + slideCount) % slideCount), [slideCount]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (paused || slideCount <= 1) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, paused, slideCount, next]);

  return (
    <div
      className="banner-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {hasBanners ? banners.map((b, i) => (
        <Link
          key={b.id}
          href={`/events/${b.id}`}
          className={`banner-slide ${i === current ? 'active' : ''}`}
          style={{ backgroundImage: `url(${b.bannerUrl.startsWith('http') ? b.bannerUrl : `${apiBase}${b.bannerUrl}`})` }}
        >
          <div className="banner-overlay" />
          <div className="banner-content">
            <span className="banner-category">{b.category}</span>
            <h2 className="banner-title">{b.title}</h2>
            <p className="banner-meta">
              <CalendarDays size={14} /> {formatDate(b.startTime)} &middot; {formatTime(b.startTime)} – {formatTime(b.endTime)} &middot; {b.hall.name}
            </p>
          </div>
        </Link>
      )) : FALLBACK_SLIDES.map((s, i) => (
        <div
          key={i}
          className={`banner-slide ${i === current ? 'active' : ''}`}
          style={{ background: s.gradient }}
        >
          <div className="banner-content" style={{ textAlign: 'center', maxWidth: '600px' }}>
            <div className="sidebar-logo-mark" style={{ margin: '0 auto 1rem', width: 48, height: 48, fontSize: '1.2rem' }}>CF</div>
            <h2 className="banner-title">{s.title}</h2>
            <p className="banner-subtitle">{s.subtitle}</p>
          </div>
        </div>
      ))}

      {/* Arrows */}
      {slideCount > 1 && (
        <>
          <button className="banner-arrow banner-arrow-left" onClick={(e) => { e.preventDefault(); prev(); }} aria-label="Previous">
            <ChevronLeft size={22} />
          </button>
          <button className="banner-arrow banner-arrow-right" onClick={(e) => { e.preventDefault(); next(); }} aria-label="Next">
            <ChevronRightIcon size={22} />
          </button>
        </>
      )}

      {/* Dots */}
      {slideCount > 1 && (
        <div className="banner-dots">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button key={i} className={`banner-dot ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
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

      {/* BANNER CAROUSEL */}
      <BannerCarousel />

      {/* HERO with animated background paths */}
      <section className="hero" style={{ position: 'relative', zIndex: 1, overflow: 'hidden', minHeight: '100vh' }}>
        <BackgroundPaths />
        <div className="container hero-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="anim-fade hero-float" style={{ maxWidth: '660px' }}>
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
  const [timeLeft, setTimeLeft] = useState(0);

  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  useEffect(() => {
    const update = () => setTimeLeft(Math.max(0, Math.floor((+eventStart - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [event.startTime]);

  const isLive = Date.now() >= +eventStart && Date.now() <= +eventEnd;
  const isPast = Date.now() > +eventEnd;
  const isSoon = timeLeft > 0 && timeLeft < 86400; // under 24h

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

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
    <motion.div
      className="event-card"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 25 } }}
      style={{ cursor: 'pointer' }}
    >
      {/* Image with gradient overlay */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {event.posterUrl ? (
          <motion.img
            src={event.posterUrl.startsWith('http') ? event.posterUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${event.posterUrl}`}
            alt={event.title}
            className="event-card-img"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        ) : (
          <div className="event-card-img-placeholder">
            {event.category[0]}
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Category badge on image */}
        <span style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(10,12,16,0.75)',
          backdropFilter: 'blur(8px)',
          color: 'var(--lime)',
          padding: '0.25rem 0.65rem',
          borderRadius: '999px',
          fontSize: '0.7rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          border: '1px solid rgba(190,242,100,0.2)',
        }}>
          {event.category}
        </span>

        {/* Urgency / Status badges */}
        {isSoon && !isLive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'var(--rose)',
              color: '#fff',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            ⚡ Starts Soon!
          </motion.span>
        )}
        {isLive && (
          <motion.span
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: '#22c55e',
              color: '#fff',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            LIVE NOW
          </motion.span>
        )}

        {/* Invite type badge */}
        <span style={{
          position: 'absolute', bottom: 10, right: 10,
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          background: event.inviteType === 'PUBLIC' ? 'rgba(96,189,255,0.15)' : 'rgba(251,176,64,0.15)',
          color: event.inviteType === 'PUBLIC' ? 'var(--sky)' : 'var(--amber)',
          padding: '0.2rem 0.55rem',
          borderRadius: '999px',
          fontSize: '0.65rem',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          border: `1px solid ${event.inviteType === 'PUBLIC' ? 'rgba(96,189,255,0.25)' : 'rgba(251,176,64,0.25)'}`,
        }}>
          {event.inviteType === 'PUBLIC' ? <><Globe size={10} /> Public</> : <><Lock size={10} /> Invite</>}
        </span>
      </div>

      <div className="event-card-body">
        {/* Title */}
        <div className="event-card-title" style={{ marginBottom: '0.3rem' }}>{event.title}</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          {event.description.slice(0, 85)}{event.description.length > 85 ? '...' : ''}
        </p>

        {/* Meta info */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={12} />{formatDate(event.startTime)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{event.hall.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{event._count?.rsvps ?? 0} RSVPs</span>
        </div>

        {/* Countdown Timer */}
        {!isPast && timeLeft > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Clock size={11} /> Starts in
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              {[
                { v: days, l: 'Days' },
                { v: hours, l: 'Hrs' },
                { v: minutes, l: 'Min' },
                { v: seconds, l: 'Sec' },
              ].map((u, i) => (
                <div key={u.l} style={{
                  background: 'var(--ink)',
                  borderRadius: '0.6rem',
                  padding: '0.45rem 0.3rem',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                }}>
                  <motion.div
                    key={`${u.l}-${u.v}`}
                    initial={i === 3 ? { scale: 1.1, opacity: 0.7 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: isSoon ? 'var(--rose)' : 'var(--lime)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {u.v.toString().padStart(2, '0')}
                  </motion.div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live / Past status */}
        {isLive && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'center', marginBottom: '0.75rem',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e' }}>🎉 Event is Live!</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Happening right now</div>
          </div>
        )}
        {isPast && (
          <div style={{
            background: 'var(--ink)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', padding: '0.5rem', textAlign: 'center', marginBottom: '0.75rem',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Event Ended</div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {event.inviteType === 'PUBLIC' ? (
            <motion.button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => { setShowRsvp(!showRsvp); setMsg(''); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {showRsvp ? 'Cancel' : timeLeft > 0 ? '+ Reserve Spot' : '+ RSVP'}
            </motion.button>
          ) : (
            <motion.button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => { setShowInviteReq(!showInviteReq); setMsg(''); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {showInviteReq ? 'Cancel' : <><Lock size={12} style={{ marginRight: 4 }} />Request Invite</>}
            </motion.button>
          )}
        </div>

        {/* RSVP form */}
        {showRsvp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
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
          </motion.div>
        )}

        {/* Invite request form */}
        {showInviteReq && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            {msg && <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
            <input className="form-input" placeholder="Your name" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} />
            <input className="form-input" placeholder="Email" type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            <textarea className="form-textarea" placeholder="Why do you want to attend?" value={inviteForm.info} onChange={e => setInviteForm(p => ({ ...p, info: e.target.value }))} rows={3} />
            <button className="btn btn-secondary btn-sm btn-full" onClick={submitInvite} disabled={loading}>
              {loading ? 'Submitting...' : 'Request Invite'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
