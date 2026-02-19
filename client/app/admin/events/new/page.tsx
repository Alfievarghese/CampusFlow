'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Hall { id: string; name: string; capacity: number; location: string; }
interface ConflictEvent { id: string; title: string; startTime: string; endTime: string; hall: string; host: string; }

const CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Technical', 'Workshop', 'Social', 'Other'];
const RECURRENCE_TYPES = ['NONE', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

export default function NewEventPage() {
    const router = useRouter();
    const [halls, setHalls] = useState<Hall[]>([]);
    const [form, setForm] = useState({
        title: '', description: '', startTime: '', endTime: '',
        hallId: '', category: 'Academic', inviteType: 'PUBLIC',
        expectedAttendance: '', recurrenceType: 'NONE',
        recurrenceInterval: '1', recurrenceUntil: '',
    });
    const [poster, setPoster] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
    const [conflictTarget, setConflictTarget] = useState<string | null>(null);
    const [overrideReason, setOverrideReason] = useState('');
    const [step, setStep] = useState(1); // 1: form, 2: conflict, 3: override

    useEffect(() => {
        api.get('/halls').then(res => setHalls(res.data)).catch(() => { });
    }, []);

    const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const buildRecurrenceRule = () => {
        if (form.recurrenceType === 'NONE') return null;
        return JSON.stringify({
            type: form.recurrenceType,
            interval: parseInt(form.recurrenceInterval) || 1,
            until: form.recurrenceUntil || null,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setWarning(''); setConflicts([]);
        if (!form.title || !form.startTime || !form.endTime || !form.hallId) {
            return setError('Please fill all required fields.');
        }

        setLoading(true);
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (!['recurrenceType', 'recurrenceInterval', 'recurrenceUntil'].includes(k)) {
                    data.append(k, v);
                }
            });
            const rrule = buildRecurrenceRule();
            if (rrule) data.append('recurrenceRule', rrule);
            if (poster) data.append('poster', poster);

            const res = await api.post('/events', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.capacityWarning) setWarning(res.data.capacityWarning);
            router.push('/admin/events');
        } catch (err: any) {
            const d = err.response?.data;
            if (d?.conflicts) {
                setConflicts(d.conflicts);
                if (d.capacityWarning) setWarning(d.capacityWarning);
                setStep(2);
            } else {
                setError(d?.error || 'Failed to create event.');
            }
        }
        setLoading(false);
    };

    const requestOverride = async () => {
        if (!conflictTarget || !overrideReason) return setError('Please select a conflicting event and provide a reason.');
        setLoading(true);
        try {
            await api.post('/conflicts/request-override', {
                conflictEventId: conflictTarget,
                newEventTitle: form.title,
                newEventStart: form.startTime,
                newEventEnd: form.endTime,
                hallId: form.hallId,
                reason: overrideReason,
            });
            router.push('/admin/requests');
        } catch (e: any) { setError(e.response?.data?.error || 'Error submitting request.'); }
        setLoading(false);
    };

    const selectedHall = halls.find(h => h.id === form.hallId);

    // Step 2: Conflict resolution screen
    if (step === 2) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Hall Conflict Detected</h1>
                        <p className="page-subtitle">The selected hall is already booked. Review conflicts below.</p>
                    </div>
                </div>
                {warning && <div className="alert alert-warning mb-2">{warning}</div>}
                {error && <div className="alert alert-error mb-2">{error}</div>}

                <div className="card mb-2">
                    <div className="card-header"><span className="card-title">Conflicting Bookings</span></div>
                    {conflicts.map(c => (
                        <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '1rem', borderRadius: 'var(--radius)',
                            background: conflictTarget === c.id ? 'var(--rose-glow)' : 'var(--ink-3)',
                            border: `1px solid ${conflictTarget === c.id ? 'rgba(255,107,107,0.3)' : 'var(--border)'}`,
                            marginBottom: '0.75rem', cursor: 'pointer',
                        }} onClick={() => setConflictTarget(c.id)}>
                            <input type="radio" checked={conflictTarget === c.id} onChange={() => setConflictTarget(c.id)} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{c.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {new Date(c.startTime).toLocaleString()} – {new Date(c.endTime).toLocaleTimeString()}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Hall: {c.hall} · Host: {c.host}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header"><span className="card-title">Request Override</span></div>
                    <p className="text-secondary mb-2" style={{ fontSize: '0.88rem' }}>
                        Select a conflicting booking above and provide a reason to request the event host to cancel their booking in your favour.
                    </p>
                    <div className="form-group mb-2">
                        <label className="form-label">Reason for Override Request</label>
                        <textarea className="form-textarea" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain why this is a priority..." />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back to Form</button>
                        <button className="btn btn-primary" onClick={requestOverride} disabled={loading || !conflictTarget}>
                            {loading ? 'Submitting...' : 'Submit Override Request'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Create Event</h1>
                    <p className="page-subtitle">Book a hall and schedule a new campus event</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-2">{error}</div>}
            {warning && <div className="alert alert-warning mb-2">{warning}</div>}

            <form onSubmit={handleSubmit}>
                <div className="grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="card">
                            <div className="card-header"><span className="card-title">Event Details</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Event Title *</label>
                                    <input className="form-input" placeholder="e.g. Annual Science Symposium" value={form.title} onChange={e => f('title', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" placeholder="Describe the event..." value={form.description} onChange={e => f('description', e.target.value)} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category *</label>
                                        <select className="form-select" value={form.category} onChange={e => f('category', e.target.value)}>
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visibility</label>
                                        <select className="form-select" value={form.inviteType} onChange={e => f('inviteType', e.target.value)}>
                                            <option value="PUBLIC">🌐 Public</option>
                                            <option value="INVITE_ONLY">🔒 Invite Only</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Event Poster</label>
                                    <input type="file" className="form-input" accept="image/*"
                                        onChange={e => setPoster(e.target.files?.[0] || null)}
                                        style={{ padding: '0.5rem' }} />
                                    <span className="form-hint">Max 5MB – JPG, PNG, WEBP</span>
                                </div>
                            </div>
                        </div>

                        {/* Recurrence */}
                        <div className="card">
                            <div className="card-header"><span className="card-title">Recurrence (Optional)</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Repeat</label>
                                    <select className="form-select" value={form.recurrenceType} onChange={e => f('recurrenceType', e.target.value)}>
                                        {RECURRENCE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                {form.recurrenceType !== 'NONE' && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Interval</label>
                                            <input className="form-input" type="number" min={1} value={form.recurrenceInterval} onChange={e => f('recurrenceInterval', e.target.value)} />
                                            <span className="form-hint">Every N {form.recurrenceType.toLowerCase()}(s)</span>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Until Date</label>
                                            <input className="form-input" type="date" value={form.recurrenceUntil} onChange={e => f('recurrenceUntil', e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="card">
                            <div className="card-header"><span className="card-title">Hall & Time</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Hall *</label>
                                    <select className="form-select" value={form.hallId} onChange={e => f('hallId', e.target.value)} required>
                                        <option value="">— Select a hall —</option>
                                        {halls.map(h => (
                                            <option key={h.id} value={h.id}>
                                                {h.name} — Capacity: {h.capacity} · {h.location}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedHall && (
                                    <div className="alert alert-info">
                                        Hall capacity: <strong>{selectedHall.capacity}</strong> people · {selectedHall.location}
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Start Date & Time *</label>
                                    <input className="form-input" type="datetime-local" value={form.startTime} onChange={e => f('startTime', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date & Time *</label>
                                    <input className="form-input" type="datetime-local" value={form.endTime} onChange={e => f('endTime', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expected Attendance</label>
                                    <input className="form-input" type="number" min={0} placeholder="0" value={form.expectedAttendance} onChange={e => f('expectedAttendance', e.target.value)} />
                                    {selectedHall && parseInt(form.expectedAttendance) > selectedHall.capacity && (
                                        <span className="form-error">⚠ Exceeds hall capacity of {selectedHall.capacity}!</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                    Checking for conflicts...
                                </span>
                            ) : '📅 Create Event'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
