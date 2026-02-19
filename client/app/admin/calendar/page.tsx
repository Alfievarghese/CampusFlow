'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '@/lib/api';
import { useState } from 'react';

interface CalEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    className: string;
    extendedProps: { hall: string; host: string; status: string; category: string; };
}

export default function CalendarPage() {
    const [events, setEvents] = useState<CalEvent[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [view, setView] = useState<'common' | 'my'>('common');
    const router = useRouter();

    useEffect(() => {
        loadEvents();
    }, [view]);

    const loadEvents = async () => {
        try {
            const endpoint = view === 'my' ? '/events/my' : '/events';
            const res = await api.get(endpoint);
            const mapped = res.data.map((e: any) => ({
                id: e.id,
                title: e.title,
                start: e.startTime,
                end: e.endTime,
                className: `event-${e.status.toLowerCase().replace('_', '-')}`,
                extendedProps: { hall: e.hall.name, host: e.creator.name, status: e.status, category: e.category },
            }));
            setEvents(mapped);
        } catch { }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{view === 'common' ? 'Common Calendar' : 'My Calendar'}</h1>
                    <p className="page-subtitle">All booked events across campus halls</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className={`btn ${view === 'common' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setView('common')}>Common</button>
                    <button className={`btn ${view === 'my' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setView('my')}>My Events</button>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[['event-confirmed', 'Confirmed'], ['event-pending', 'Pending'], ['event-cancelled', 'Cancelled'], ['event-conflict', 'Conflict Requested']].map(([cls, label]) => (
                    <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span className={`badge ${cls.replace('event-', 'badge-')}`} style={{ width: 12, height: 12, borderRadius: 3, padding: 0 }} />
                        {label}
                    </div>
                ))}
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    events={events}
                    height={680}
                    eventClick={(info) => setSelected(info.event)}
                    dateClick={(info) => router.push(`/admin/events/new?date=${info.dateStr}`)}
                    eventClassNames={(info) => [info.event.className]}
                />
            </div>

            {/* Event detail popup */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selected.title}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className={`badge badge-${selected.extendedProps.status.toLowerCase().replace('_', '-')}`}>{selected.extendedProps.status}</span>
                                <span className="badge badge-confirmed">{selected.extendedProps.category}</span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div>📅 Start: <strong>{new Date(selected.start).toLocaleString()}</strong></div>
                                <div>🕐 End: <strong>{new Date(selected.end).toLocaleString()}</strong></div>
                                <div>🏢 Hall: <strong>{selected.extendedProps.hall}</strong></div>
                                <div>👤 Host: <strong>{selected.extendedProps.host}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
