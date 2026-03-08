'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import {
    CalendarDays, Target, Clock, Inbox,
    PlusCircle, Calendar, ArrowRight,
    Activity, TrendingUp, Zap, Users,
} from 'lucide-react';

interface Stats { totalEvents: number; myEvents: number; pendingRequests: number; upcomingEvents: number; }
interface RecentEvent { id: string; title: string; startTime: string; status: string; category: string; hall: { name: string }; }

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function formatTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }

/* ─── Bento Item with mouse-tracking glow ─── */
function BentoItem({ children, style, className = '', onClick }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const handleMouse = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
        ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    return (
        <div
            ref={ref}
            className={`bento-item ${className}`}
            onMouseMove={handleMouse}
            onClick={onClick}
            style={style}
        >
            {children}
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats>({ totalEvents: 0, myEvents: 0, pendingRequests: 0, upcomingEvents: 0 });
    const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [allEvents, myEvents, conflicts] = await Promise.all([
                    api.get('/events'),
                    api.get('/events/my'),
                    api.get('/conflicts'),
                ]);
                const now = new Date();
                setStats({
                    totalEvents: allEvents.data.length,
                    myEvents: myEvents.data.length,
                    pendingRequests: conflicts.data.filter((r: any) => r.status === 'PENDING').length,
                    upcomingEvents: allEvents.data.filter((e: RecentEvent) => new Date(e.startTime) > now).length,
                });
                setRecentEvents(myEvents.data.slice(0, 5));
            } catch { }
            setLoading(false);
        }
        loadData();
    }, []);

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    })();

    return (
        <div>
            {/* Header */}
            <div className="page-header anim-fade">
                <div>
                    <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>
                        {greeting}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="page-subtitle">Here&apos;s what&apos;s happening on campus today.</p>
                </div>
                <Link href="/admin/events/new" className="btn btn-primary">
                    <PlusCircle size={16} strokeWidth={1.75} style={{ marginRight: '0.4rem' }} />
                    Create Event
                </Link>
            </div>

            {/* ─── BENTO GRID ─── */}
            <div className="bento-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: 'minmax(140px, auto)',
                gap: '1rem',
            }}>

                {/* ── STAT: Total Events (large) ── */}
                <BentoItem style={{ gridColumn: 'span 2', gridRow: 'span 1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Total Events
                        </span>
                        <div style={{
                            width: 36, height: 36, borderRadius: '0.6rem',
                            background: 'rgba(190,242,100,0.1)', border: '1px solid rgba(190,242,100,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CalendarDays size={18} style={{ color: 'var(--lime)' }} />
                        </div>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--lime)', lineHeight: 1 }}>
                        {loading ? '—' : stats.totalEvents}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={12} style={{ color: 'var(--lime)' }} /> Across all campus halls
                    </p>
                </BentoItem>

                {/* ── STAT: My Events ── */}
                <BentoItem>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            My Events
                        </span>
                        <Target size={16} style={{ color: 'var(--sky)', opacity: 0.8 }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sky)', lineHeight: 1 }}>
                        {loading ? '—' : stats.myEvents}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Events you created</p>
                </BentoItem>

                {/* ── STAT: Upcoming ── */}
                <BentoItem>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Upcoming
                        </span>
                        <Clock size={16} style={{ color: 'var(--amber)', opacity: 0.8 }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--amber)', lineHeight: 1 }}>
                        {loading ? '—' : stats.upcomingEvents}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Scheduled ahead</p>
                </BentoItem>

                {/* ── Recent Events (wide card) ── */}
                <BentoItem style={{ gridColumn: 'span 3', gridRow: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={16} style={{ color: 'var(--lime)' }} />
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>My Recent Events</span>
                        </div>
                        <Link href="/admin/events" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                            View All <ArrowRight size={12} style={{ marginLeft: '0.25rem' }} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
                            <div className="spinner" />
                        </div>
                    ) : recentEvents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                            <CalendarDays size={36} strokeWidth={1} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '0.85rem' }}>No events yet. <Link href="/admin/events/new" style={{ color: 'var(--lime)' }}>Create your first.</Link></p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {recentEvents.map(event => (
                                <Link key={event.id} href={`/admin/events/${event.id}/edit`} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.65rem 0.85rem',
                                    background: 'var(--ink)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border)',
                                    textDecoration: 'none',
                                    transition: 'border-color 0.2s',
                                    gap: '0.75rem',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {event.title}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                            {formatDate(event.startTime)} · {formatTime(event.startTime)} · {event.hall.name}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                        <span className="badge badge-confirmed" style={{ fontSize: '0.65rem' }}>{event.category}</span>
                                        <span className={`badge badge-${event.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '0.65rem' }}>{event.status}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </BentoItem>

                {/* ── Pending Requests + Quick Actions (tall sidebar) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 1', gridRow: 'span 2' }}>
                    {/* Pending Requests */}
                    <BentoItem style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Pending
                            </span>
                            <Inbox size={16} style={{ color: 'var(--rose)', opacity: 0.8 }} />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--rose)', lineHeight: 1 }}>
                            {loading ? '—' : stats.pendingRequests}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Requests awaiting</p>
                        <Link href="/admin/requests" className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem', fontSize: '0.72rem', width: '100%', justifyContent: 'center' }}>
                            Review <ArrowRight size={11} style={{ marginLeft: 4 }} />
                        </Link>
                    </BentoItem>

                    {/* Quick Actions */}
                    <BentoItem style={{ flex: 1 }} className="quick-action-bento">
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>
                            Quick Actions
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <Link href="/admin/events/new" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                borderRadius: '0.4rem', background: 'var(--ink)', border: '1px solid var(--border)',
                                textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.78rem',
                                transition: 'border-color 0.15s',
                            }}>
                                <Zap size={14} style={{ color: 'var(--lime)' }} /> New Event
                            </Link>
                            <Link href="/admin/calendar" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                borderRadius: '0.4rem', background: 'var(--ink)', border: '1px solid var(--border)',
                                textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.78rem',
                                transition: 'border-color 0.15s',
                            }}>
                                <Calendar size={14} style={{ color: 'var(--sky)' }} /> Calendar
                            </Link>
                            <Link href="/admin/halls" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                                borderRadius: '0.4rem', background: 'var(--ink)', border: '1px solid var(--border)',
                                textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.78rem',
                                transition: 'border-color 0.15s',
                            }}>
                                <Users size={14} style={{ color: 'var(--amber)' }} /> Halls
                            </Link>
                        </div>
                    </BentoItem>
                </div>
            </div>
        </div>
    );
}
