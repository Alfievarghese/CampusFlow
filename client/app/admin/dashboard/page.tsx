'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import api from '@/lib/api';
import {
    CalendarDays, Target, Clock, Inbox,
    PlusCircle, Calendar, ArrowRight,
} from 'lucide-react';

interface Stats { totalEvents: number; myEvents: number; pendingRequests: number; upcomingEvents: number; }
interface RecentEvent { id: string; title: string; startTime: string; status: string; category: string; hall: { name: string }; }

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function formatTime(d: string) { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }

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

    const STAT_CARDS = [
        { label: 'Total Events', value: stats.totalEvents, Icon: CalendarDays, color: 'var(--lime)' },
        { label: 'My Events', value: stats.myEvents, Icon: Target, color: 'var(--sky)' },
        { label: 'Upcoming', value: stats.upcomingEvents, Icon: Clock, color: 'var(--amber)' },
        { label: 'Pending Requests', value: stats.pendingRequests, Icon: Inbox, color: 'var(--rose)' },
    ];

    return (
        <div>
            <div className="page-header anim-fade">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name}.</p>
                </div>
                <Link href="/admin/events/new" className="btn btn-primary">
                    <PlusCircle size={16} strokeWidth={1.75} style={{ marginRight: '0.4rem' }} />
                    Create Event
                </Link>
            </div>

            {/* Stats */}
            <div className="grid-4 mb-3">
                {STAT_CARDS.map((card, i) => (
                    <div key={card.label} className={`stat-card anim-slide-up anim-delay-${i + 1}`}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="stat-label">{card.label}</span>
                            <card.Icon size={18} strokeWidth={1.5} style={{ color: card.color, opacity: 0.8 }} />
                        </div>
                        <div className="stat-value" style={{ color: card.color }}>
                            {loading ? '—' : card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Events */}
            <div className="card anim-slide-up anim-delay-5">
                <div className="card-header">
                    <span className="card-title">My Recent Events</span>
                    <Link href="/admin/events" className="btn btn-ghost btn-sm">
                        View All <ArrowRight size={14} style={{ marginLeft: '0.3rem' }} />
                    </Link>
                </div>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <div className="spinner" />
                    </div>
                ) : recentEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <CalendarDays size={40} strokeWidth={1} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                        <p>No events yet. <Link href="/admin/events/new" style={{ color: 'var(--lime)' }}>Create your first event.</Link></p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Event</th><th>Date & Time</th><th>Hall</th><th>Category</th><th>Status</th></tr></thead>
                            <tbody>
                                {recentEvents.map(event => (
                                    <tr key={event.id}>
                                        <td>{event.title}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(event.startTime)} · {formatTime(event.startTime)}</td>
                                        <td>{event.hall.name}</td>
                                        <td><span className="badge badge-confirmed">{event.category}</span></td>
                                        <td><span className={`badge badge-${event.status.toLowerCase().replace('_', '-')}`}>{event.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid-3 mt-3">
                <Link href="/admin/events/new" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                    <PlusCircle size={28} strokeWidth={1.25} style={{ color: 'var(--lime)', marginBottom: '0.75rem' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Create Event</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Book a hall and schedule a new event</div>
                </Link>
                <Link href="/admin/calendar" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                    <Calendar size={28} strokeWidth={1.25} style={{ color: 'var(--sky)', marginBottom: '0.75rem' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Common Calendar</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>View all bookings across campus</div>
                </Link>
                <Link href="/admin/requests" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                    <Inbox size={28} strokeWidth={1.25} style={{ color: 'var(--amber)', marginBottom: '0.75rem' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>Requests</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Manage conflict & invite requests</div>
                </Link>
            </div>
        </div>
    );
}
