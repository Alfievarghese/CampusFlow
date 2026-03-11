'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Building2, MapPin, Users, PlusCircle, Pencil, PowerOff, X, Landmark } from 'lucide-react';

interface Hall { id: string; name: string; capacity: number; location: string; description?: string; isActive: boolean; }

export default function HallsPage() {
    const { } = useAuth();
    const [halls, setHalls] = useState<Hall[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState('');
    const [form, setForm] = useState({ name: '', capacity: '', location: '', description: '' });
    const [editId, setEditId] = useState<string | null>(null);

    const fetchHalls = async () => {
        setLoading(true);
        try { const r = await api.get('/halls'); setHalls(r.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchHalls(); }, []);

    const submit = async () => {
        if (!form.name || !form.capacity || !form.location) return setMsg('Name, capacity, and location required.');
        try {
            if (editId) {
                await api.patch(`/halls/${editId}`, form);
                setMsg('Venue updated.');
            } else {
                await api.post('/halls', form);
                setMsg('Venue created.');
            }
            setShowForm(false);
            setEditId(null);
            setForm({ name: '', capacity: '', location: '', description: '' });
            fetchHalls();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const deactivate = async (id: string) => {
        try { await api.delete(`/halls/${id}`); setMsg('Venue deactivated.'); fetchHalls(); }
        catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const startEdit = (h: Hall) => {
        setEditId(h.id);
        setForm({ name: h.name, capacity: String(h.capacity), location: h.location, description: h.description || '' });
        setShowForm(true);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent pb-1">Venue Management</h1>
                    <p className="text-muted-foreground text-base max-w-lg">View and manage campus venues and locations.</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setMsg(''); setForm({ name: '', capacity: '', location: '', description: '' }); }}>
                    <PlusCircle size={16} strokeWidth={1.75} style={{ marginRight: '0.4rem' }} />
                    Add Venue
                </button>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
            ) : (
                <div className="grid-3">
                    {halls.map((hall, i) => (
                        <div key={hall.id} className={`bento-item hover:scale-[1.02] transition-transform duration-300 anim-slide-up anim-delay-${Math.min(i + 1, 5)}`}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--lime-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--lime)' }} />
                                </div>
                                <span className={`badge ${hall.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                    {hall.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>{hall.name}</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <MapPin size={13} strokeWidth={1.75} />
                                    {hall.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Users size={13} strokeWidth={1.75} />
                                    Capacity: <strong style={{ color: 'var(--text-primary)' }}>{hall.capacity.toLocaleString()}</strong>
                                </div>
                                {hall.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{hall.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} onClick={() => startEdit(hall)}>
                                    <Pencil size={13} strokeWidth={1.75} /> Edit
                                </button>
                                {hall.isActive && (
                                    <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => deactivate(hall.id)}>
                                        <PowerOff size={13} strokeWidth={1.75} /> Deactivate
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {halls.length === 0 && (
                        <div style={{ gridColumn: '1/-1' }} className="flex flex-col items-center justify-center p-20 text-center relative overflow-hidden bento-item mt-4">
                            <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                            <div className="bg-gradient-to-br from-lime-500/10 to-emerald-500/10 p-5 rounded-full mb-5 border border-lime-500/20">
                                <Landmark size={36} className="text-lime-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">No venues added yet</h3>
                            <p className="text-muted-foreground max-w-md leading-relaxed mb-4">You haven't added any campus locations. Add the first venue above.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Venue Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editId ? 'Edit Venue' : 'Add New Venue'}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Venue Name *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Auditorium, Central Courtyard" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Capacity *</label>
                                    <input className="form-input" type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="500" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location *</label>
                                    <input className="form-input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Block A, Floor 2" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Additional notes about this venue..." />
                            </div>
                            {msg && <div className="alert alert-error">{msg}</div>}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={submit}>{editId ? 'Save Changes' : 'Create Venue'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
