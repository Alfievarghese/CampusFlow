'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { PlusCircle, CalendarDays, Globe, Lock, RefreshCw, Edit2, Ban, X, AlertTriangle, Eye, FileText } from 'lucide-react';

interface Event {
    id: string; title: string; startTime: string; endTime: string;
    status: string; category: string; inviteType: string;
    hall: { name: string }; expectedAttendance: number;
    recurrenceRule?: string; _count: { rsvps: number };
    hasReport?: boolean;
}

function formatDT(d: string) { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [msg, setMsg] = useState('');

    const fetchEvents = async () => {
        setLoading(true);
        try { const res = await api.get('/events/my'); setEvents(res.data); }
        catch { }
        setLoading(false);
    };

    useEffect(() => { fetchEvents(); }, []);

    const cancelEvent = async () => {
        if (!cancelId) return;
        try {
            await api.delete(`/events/${cancelId}`, { data: { reason: cancelReason } });
            setMsg('Event cancelled successfully.');
            setCancelId(null);
            setCancelReason('');
            fetchEvents();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error cancelling event.'); }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent pb-1">My Events</h1>
                    <p className="text-muted-foreground text-base max-w-lg">Manage events you have created or host across the campus.</p>
                </div>
                <Link href="/admin/events/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <PlusCircle size={16} strokeWidth={1.75} />
                    New Event
                </Link>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            <div className="bento-item p-0 overflow-hidden relative">
                <div className="table-wrap border-0">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                            <div className="bg-gradient-to-br from-lime-500/10 to-emerald-500/10 p-5 rounded-full mb-5 border border-lime-500/20">
                                <CalendarDays size={36} className="text-lime-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">No events yet</h3>
                            <p className="text-muted-foreground max-w-md leading-relaxed mb-4">You haven't created any events. Start planning your first campus event today.</p>
                            <Link href="/admin/events/new" className="text-primary hover:underline font-medium">Create your first event →</Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white/5 backdrop-blur-sm text-white/70 uppercase text-[0.65rem] font-bold tracking-wider border-b border-white/10">
                                    <tr>
                                        <th className="px-5 py-4">Title</th>
                                        <th className="px-5 py-4">Start Time</th>
                                        <th className="px-5 py-4">Hall</th>
                                        <th className="px-5 py-4 text-center">Category</th>
                                        <th className="px-5 py-4 text-center">Type</th>
                                        <th className="px-5 py-4 text-center">RSVPs</th>
                                        <th className="px-5 py-4 text-center">Status</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-t-0 text-foreground">
                                    {events.map(event => {
                                        const isPast = new Date() > new Date(event.endTime);
                                        const displayStatus = isPast && event.status !== 'CANCELLED' ? 'COMPLETED' : event.status;
                                        
                                        return (
                                        <tr key={event.id} className="hover:bg-accent/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <Link href={`/admin/events/${event.id}`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-2">
                                                    {event.title}
                                                    {event.recurrenceRule && (
                                                        <span title="Recurring event" className="flex items-center">
                                                            <RefreshCw size={12} className="text-sky-400" />
                                                        </span>
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">{formatDT(event.startTime)}</td>
                                            <td className="px-5 py-4 font-medium text-xs">{event.hall.name}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="text-[0.65rem] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest bg-white/10 border border-white/20 shadow-sm whitespace-nowrap">
                                                    {event.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center gap-1 text-[0.65rem] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest whitespace-nowrap ${event.inviteType === 'PUBLIC' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'}`}>
                                                    {event.inviteType === 'PUBLIC' ? <Globe size={10} /> : <Lock size={10} />}
                                                    {event.inviteType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center font-mono text-xs">{event._count?.rsvps ?? 0}</td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`text-[0.65rem] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest whitespace-nowrap ${
                                                    displayStatus === 'COMPLETED' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                                    displayStatus === 'CONFIRMED' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                                                    displayStatus === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/admin/events/${event.id}`} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-colors text-xs font-bold">
                                                        <Eye size={12} /> View
                                                    </Link>
                                                    <Link href={`/admin/events/${event.id}/edit`} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-colors text-xs font-bold">
                                                        <Edit2 size={12} /> Edit
                                                    </Link>
                                                    {isPast && event.status !== 'CANCELLED' && (
                                                        <Link href={`/admin/events/${event.id}`} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors text-xs font-bold">
                                                            <FileText size={12} /> Report
                                                        </Link>
                                                    )}
                                                    {event.status !== 'CANCELLED' && (
                                                        <button onClick={() => { setCancelId(event.id); setCancelReason(''); }} className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors text-xs font-bold">
                                                            <Ban size={12} /> Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel modal */}
            {cancelId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setCancelId(null)}>
                    <div className="bento-item max-w-md w-full p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-rose-400">
                                <AlertTriangle size={20} />
                                Cancel Event
                            </h3>
                            <button className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full p-1 transition-colors" onClick={() => setCancelId(null)}><X size={18} /></button>
                        </div>
                        <p className="text-secondary mb-4 text-sm leading-relaxed">Please provide a reason for cancellation. RSVPs will be notified about this change.</p>
                        <div className="space-y-2 mb-6">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cancellation Reason</label>
                            <textarea className="flex min-h-[80px] w-full rounded-2xl border border-input bg-secondary/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Required details for attendees..." rows={3} />
                        </div>
                        <div className="flex gap-3 justify-end mt-2">
                            <button className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-sm font-bold transition-colors" onClick={() => setCancelId(null)}>Go Back</button>
                            <button className="h-10 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all hover:-translate-y-0.5 text-sm font-bold flex items-center gap-2" onClick={cancelEvent}>
                                <Ban size={16} /> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
