'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Event {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    category: string;
    inviteType: string;
    hall: { name: string };
    expectedAttendance: number;
    recurrenceRule?: string;
    _count: { rsvps: number };
}

function formatDT(d: string) {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [msg, setMsg] = useState('');

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events/my');
            setEvents(res.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchEvents(); }, []);

    const cancelEvent = async () => {
        if (!cancelId) return;
        try {
            await api.delete(`/events/${cancelId}`, { data: { reason: cancelReason } });
            setMsg('Event cancelled.');
            setCancelId(null);
            setCancelReason('');
            fetchEvents();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error cancelling event.'); }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Events</h1>
                    <p className="page-subtitle">Manage events you have created</p>
                </div>
                <Link href="/admin/events/new" className="btn btn-primary">+ New Event</Link>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            <div className="card">
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
                    ) : events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                            <p>No events yet. <Link href="/admin/events/new" style={{ color: 'var(--lime)' }}>Create your first event →</Link></p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Start</th>
                                    <th>Hall</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                    <th>RSVPs</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(event => (
                                    <tr key={event.id}>
                                        <td>
                                            {event.title}
                                            {event.recurrenceRule && <span className="badge badge-conflict" style={{ marginLeft: '0.5rem' }}>🔁</span>}
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{formatDT(event.startTime)}</td>
                                        <td>{event.hall.name}</td>
                                        <td><span className="badge badge-confirmed">{event.category}</span></td>
                                        <td><span className={`badge ${event.inviteType === 'PUBLIC' ? 'badge-public' : 'badge-invite'}`}>
                                            {event.inviteType === 'PUBLIC' ? '🌐' : '🔒'} {event.inviteType}
                                        </span></td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{event._count.rsvps}</td>
                                        <td><span className={`badge badge-${event.status.toLowerCase().replace('_', '-')}`}>{event.status}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <Link href={`/admin/events/${event.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                                                {event.status !== 'CANCELLED' && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => { setCancelId(event.id); setCancelReason(''); }}>
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Cancel modal */}
            {cancelId && (
                <div className="modal-overlay" onClick={() => setCancelId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Cancel Event</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setCancelId(null)}>✕</button>
                        </div>
                        <p className="text-secondary mb-2">Please provide a reason for cancellation.</p>
                        <div className="form-group mb-2">
                            <label className="form-label">Cancellation Reason</label>
                            <textarea className="form-textarea" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Enter reason..." rows={3} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setCancelId(null)}>Go Back</button>
                            <button className="btn btn-danger" onClick={cancelEvent}>Confirm Cancellation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
