'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CalendarDays, Clock, Building2, User, Search, Plus, ChevronRight, Calendar as CalendarIcon, AlignLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, parseISO } from 'date-fns';

interface CalEvent {
    id: string; title: string; startTime: string; endTime: string;
    hall: { name: string; location: string }; creator: { name: string };
    status: string; category: string; description: string; inviteType: string;
    posterUrl: string | null; expectedAttendance: number;
}

export default function CalendarPage() {
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [view, setView] = useState<'common' | 'my'>('common');
    const [layout, setLayout] = useState<'list' | 'grid'>('list');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
    const router = useRouter();

    const loadEvents = async () => {
        try {
            const endpoint = view === 'my' ? '/events/my' : '/events';
            const res = await api.get(endpoint);
            setEvents(res.data);
        } catch {}
    };

    useEffect(() => {
        loadEvents();
    }, [view]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.hall.name.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
            return matchSearch && matchStatus;
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, search, statusFilter]);

    // Group events by date for list view
    const groupedEvents = useMemo(() => {
        const groups: Record<string, CalEvent[]> = {};
        filteredEvents.forEach(e => {
            const dateStr = format(parseISO(e.startTime), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(e);
        });
        return groups;
    }, [filteredEvents]);

    return (
        <div className="flex flex-col gap-6" style={{ paddingBottom: '4rem' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">{view === 'common' ? 'Common Calendar' : 'My Events'}</h1>
                    <p className="text-muted-foreground text-sm">Manage and discover campus events seamlessly.</p>
                </div>
                <div className="flex bg-secondary p-1 rounded-lg">
                    <button className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'common' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('common')}>Common</button>
                    <button className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'my' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setView('my')}>My Events</button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex items-center gap-2 w-full max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Search events or venues..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none" 
                        value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING">Pending</option>
                    </select>
                    <div className="flex bg-secondary p-1 rounded-lg">
                        <button className={`p-1.5 rounded-md transition-all ${layout === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setLayout('list')}><AlignLeft className="h-4 w-4" /></button>
                        <button className={`p-1.5 rounded-md transition-all ${layout === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`} onClick={() => setLayout('grid')}><CalendarIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>

            {/* Event List/Grid View */}
            <div className="mt-4">
                {filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card border-dashed">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No events found</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mb-4">There are no events matching your current filters or date range.</p>
                        <button className="btn btn-primary btn-sm" onClick={() => router.push('/admin/events/new')}>
                            <Plus size={16} /> Create Event
                        </button>
                    </div>
                ) : layout === 'list' ? (
                    <div className="space-y-8">
                        {Object.entries(groupedEvents).map(([dateStr, dayEvents]) => (
                            <div key={dateStr} className="relative">
                                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 mb-4 border-b">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <div className="bg-primary/10 text-primary w-10 h-10 rounded-lg flex flex-col items-center justify-center leading-none">
                                            <span className="text-xs uppercase font-bold opacity-80">{format(parseISO(dateStr), 'MMM')}</span>
                                            <span className="text-lg font-bold">{format(parseISO(dateStr), 'd')}</span>
                                        </div>
                                        {format(parseISO(dateStr), 'EEEE, MMMM do, yyyy')}
                                    </h3>
                                </div>
                                <div className="grid gap-3 pl-[3.25rem]">
                                    {dayEvents.map(e => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                                            key={e.id} 
                                            className="group cursor-pointer rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-primary/40 relative overflow-hidden"
                                            onClick={() => setSelectedEvent(e)}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ 
                                                backgroundColor: e.status === 'APPROVED' ? 'var(--lime)' : e.status === 'PENDING' ? 'var(--amber)' : 'var(--rose)' 
                                            }} />
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-primary/80 tracking-tight">{format(parseISO(e.startTime), 'h:mm a')}</span>
                                                        <span className="text-muted-foreground/40">—</span>
                                                        <span className="text-sm text-muted-foreground">{format(parseISO(e.endTime), 'h:mm a')}</span>
                                                        <span className={`ml-2 text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${e.status === 'APPROVED' ? 'bg-lime-500/10 text-lime-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                            {e.status}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-base font-bold mb-1 group-hover:text-primary transition-colors">{e.title}</h4>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1.5"><Building2 size={13} /> {e.hall.name}</span>
                                                        <span className="flex items-center gap-1.5"><User size={13} /> {e.creator.name}</span>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-secondary p-2 rounded-full">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <AnimatePresence>
                            {filteredEvents.map(e => (
                                <motion.div 
                                    layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                    key={e.id} 
                                    className="group cursor-pointer flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-1 overflow-hidden"
                                    onClick={() => setSelectedEvent(e)}
                                >
                                    <div className="h-32 bg-secondary relative">
                                        {e.posterUrl ? (
                                            <img src={e.posterUrl} alt={e.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                                                <CalendarDays size={40} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <span className={`text-[0.65rem] px-2 py-1 rounded-full font-bold shadow-sm backdrop-blur-md ${e.status === 'APPROVED' ? 'bg-lime-500/20 text-lime-600 border border-lime-500/30' : 'bg-amber-500/20 text-amber-600 border border-amber-500/30'}`}>
                                                {e.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="text-xs font-semibold text-primary mb-1">{format(parseISO(e.startTime), 'MMM d, yyyy • h:mm a')}</div>
                                        <h4 className="text-base font-bold mb-2 line-clamp-2 leading-tight">{e.title}</h4>
                                        <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 truncate max-w-[60%]"><Building2 size={12} className="shrink-0" /> <span className="truncate">{e.hall.name}</span></span>
                                            <span className="badge badge-outline text-[0.65rem] shrink-0">{e.category}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Event Detail Modal Overlay */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-card w-full max-w-lg rounded-2xl shadow-xl border overflow-hidden">
                            {selectedEvent.posterUrl && (
                                <div className="w-full h-48 bg-secondary relative">
                                    <img src={selectedEvent.posterUrl} alt={selectedEvent.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                                </div>
                            )}
                            <div className="p-6 relative">
                                {!selectedEvent.posterUrl && (
                                    <button className="absolute right-4 top-4 p-2 bg-secondary/50 hover:bg-secondary rounded-full transition-colors" onClick={() => setSelectedEvent(null)}><X size={16} /></button>
                                )}
                                <div className="flex gap-2 mb-3">
                                    <span className={`text-[0.7rem] px-2.5 py-1 rounded-full font-semibold ${selectedEvent.status === 'APPROVED' ? 'bg-lime-500/10 text-lime-600' : 'bg-amber-500/10 text-amber-600'}`}>{selectedEvent.status}</span>
                                    <span className="text-[0.7rem] px-2.5 py-1 rounded-full font-semibold bg-secondary text-secondary-foreground">{selectedEvent.category}</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight mb-4 leading-tight">{selectedEvent.title}</h2>
                                
                                <div className="grid gap-3 mb-6">
                                    <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-xl">
                                        <div className="bg-background p-2 rounded-lg shadow-sm border"><CalendarDays size={18} className="text-primary" /></div>
                                        <div>
                                            <div className="text-sm font-semibold">{format(parseISO(selectedEvent.startTime), 'EEEE, MMMM do, yyyy')}</div>
                                            <div className="text-xs text-muted-foreground">{format(parseISO(selectedEvent.startTime), 'h:mm a')} — {format(parseISO(selectedEvent.endTime), 'h:mm a')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-xl">
                                        <div className="bg-background p-2 rounded-lg shadow-sm border"><Building2 size={18} className="text-primary" /></div>
                                        <div>
                                            <div className="text-sm font-semibold">{selectedEvent.hall.name}</div>
                                            <div className="text-xs text-muted-foreground">{selectedEvent.hall.location}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-xl">
                                        <div className="bg-background p-2 rounded-lg shadow-sm border"><User size={18} className="text-primary" /></div>
                                        <div>
                                            <div className="text-sm font-semibold">{selectedEvent.creator.name}</div>
                                            <div className="text-xs text-muted-foreground">Event Organizer</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedEvent.description && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlignLeft size={14} /> Description</h4>
                                        <p className="text-sm text-muted-foreground bg-secondary/20 p-4 rounded-xl leading-relaxed">{selectedEvent.description}</p>
                                    </div>
                                )}
                                
                                <div className="flex gap-2 pt-4 border-t">
                                    <button className="btn btn-primary flex-1" onClick={() => router.push(`/admin/events/${selectedEvent.id}`)}>View Full Details</button>
                                    <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
