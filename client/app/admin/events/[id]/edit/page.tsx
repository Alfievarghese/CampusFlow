'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { uploadEventImage } from '@/lib/supabase';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Hall { id: string; name: string; capacity: number; location: string; }

const CATEGORIES = ['Academic', 'Cultural', 'Sports', 'Technical', 'Workshop', 'Social', 'Other'];

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;

    const [halls, setHalls] = useState<Hall[]>([]);
    const [form, setForm] = useState({
        title: '', description: '', startTime: '', endTime: '',
        hallId: '', category: 'Academic', inviteType: 'PUBLIC',
        expectedAttendance: '',
    });
    const [existingPosterUrl, setExistingPosterUrl] = useState<string | null>(null);
    const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(null);
    const [poster, setPoster] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/halls'),
            api.get(`/events/${eventId}`),
        ]).then(([hallsRes, eventRes]) => {
            setHalls(hallsRes.data);
            const e = eventRes.data;
            setForm({
                title: e.title || '',
                description: e.description || '',
                startTime: e.startTime ? new Date(e.startTime).toISOString().slice(0, 16) : '',
                endTime: e.endTime ? new Date(e.endTime).toISOString().slice(0, 16) : '',
                hallId: e.hallId || '',
                category: e.category || 'Academic',
                inviteType: e.inviteType || 'PUBLIC',
                expectedAttendance: e.expectedAttendance?.toString() || '',
            });
            setExistingPosterUrl(e.posterUrl || null);
            setExistingBannerUrl(e.bannerUrl || null);
            setLoading(false);
        }).catch(() => {
            setError('Failed to load event.');
            setLoading(false);
        });
    }, [eventId]);

    const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const selectedHall = halls.find(h => h.id === form.hallId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.title || !form.startTime || !form.endTime || !form.hallId) {
            return setError('Please fill all required fields.');
        }

        setSaving(true);
        try {
            // Upload new files to Supabase Storage if selected
            const [newPosterUrl, newBannerUrl] = await Promise.all([
                uploadEventImage(poster, 'poster'),
                uploadEventImage(banner, 'banner'),
            ]);

            const payload: Record<string, any> = { ...form };
            if (newPosterUrl) payload.posterUrl = newPosterUrl;
            if (newBannerUrl) payload.bannerUrl = newBannerUrl;

            await api.patch(`/events/${eventId}`, payload);
            router.push('/admin/events');
        } catch (err: any) {
            console.error('[CampusFlow] Event update error:', err.response?.status, err.response?.data || err.message);
            const d = err.response?.data;
            const errMsg = typeof d?.error === 'string' ? d.error : d?.error?.message || err.message || 'Failed to update event.';
            setError(errMsg);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading event...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={() => router.back()} className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div>
                    <h1 className="page-title" style={{ marginBottom: 0 }}>Edit Event</h1>
                    <p className="page-subtitle">Update event details</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Left column */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Event Details</h3>

                        <label className="form-label">Event Title *</label>
                        <input className="form-input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Event name" required />

                        <label className="form-label" style={{ marginTop: '1rem' }}>Description</label>
                        <textarea className="form-input" rows={4} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Describe the event..." />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <label className="form-label">Category *</label>
                                <select className="form-input" value={form.category} onChange={e => f('category', e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Visibility</label>
                                <select className="form-input" value={form.inviteType} onChange={e => f('inviteType', e.target.value)}>
                                    <option value="PUBLIC">Public (Open to All)</option>
                                    <option value="INVITE_ONLY">Invite Only</option>
                                </select>
                            </div>
                        </div>

                        <label className="form-label" style={{ marginTop: '1rem' }}>Event Poster</label>
                        <input type="file" accept="image/*" className="form-input" onChange={e => setPoster(e.target.files?.[0] || null)} />
                        {!poster && existingPosterUrl && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Current poster attached. Select a new file to replace it.
                            </p>
                        )}

                        <label className="form-label" style={{ marginTop: '1rem' }}>Banner Image (Optional)</label>
                        <input type="file" accept="image/*" className="form-input" onChange={e => setBanner(e.target.files?.[0] || null)} />
                        <small style={{ color: 'var(--text-secondary)' }}>Recommended: 1200×400px (3:1 ratio) — displayed on the homepage</small>
                        {!banner && existingBannerUrl && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Current banner attached. Select a new file to replace it.
                            </p>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Venue & Time</h3>


                        <label className="form-label" style={{ marginTop: '1rem' }}>Select Venue *</label>
                        <select className="form-input" value={form.hallId} onChange={e => f('hallId', e.target.value)} required>
                            <option value="">Choose a venue...</option>
                            {halls.map(h => (
                                <option key={h.id} value={h.id}>{h.name} — Capacity: {h.capacity} · {h.location}</option>
                            ))}
                        </select>

                        {selectedHall && (
                            <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                                Venue capacity: <strong>{selectedHall.capacity}</strong> people · {selectedHall.location}
                            </div>
                        )}

                        <label className="form-label" style={{ marginTop: '1rem' }}>Start Date & Time *</label>
                        <input type="datetime-local" className="form-input" value={form.startTime} onChange={e => f('startTime', e.target.value)} required />

                        <label className="form-label" style={{ marginTop: '1rem' }}>End Date & Time *</label>
                        <input type="datetime-local" className="form-input" value={form.endTime} onChange={e => f('endTime', e.target.value)} required />

                        <label className="form-label" style={{ marginTop: '1rem' }}>Expected Attendance</label>
                        <input type="number" className="form-input" value={form.expectedAttendance} onChange={e => f('expectedAttendance', e.target.value)} placeholder="Number of attendees" />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
