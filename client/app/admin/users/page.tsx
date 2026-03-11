'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
    UserPlus, CheckCircle2, XCircle, ShieldCheck, ShieldOff,
    UserCog, Users, X, Eye, EyeOff,
} from 'lucide-react';

interface AdminUser { id: string; name: string; email: string; role: string; isApproved: boolean; isActive: boolean; createdAt: string; powerRank: number; systemPermissions: string[]; }

const DEFAULT_FORM = { name: '', email: '', password: '', role: 'ADMIN', powerRank: 0, systemPermissions: [] as string[] };
const SYSTEM_PERMS = ['CREATE_ORGANIZATIONS', 'ASSIGN_POWERS'];

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try { const r = await api.get('/admin/users'); setUsers(r.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const approve = async (id: string) => {
        try { await api.patch(`/admin/users/${id}/approve`); setMsg('Admin approved.'); fetchUsers(); }
        catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const reject = async (id: string) => {
        try { await api.patch(`/admin/users/${id}/reject`); setMsg('Admin rejected/deactivated.'); fetchUsers(); }
        catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const createAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return setMsg('All fields are required.');
        if (form.password.length < 8) return setMsg('Password must be at least 8 characters.');
        setSubmitting(true);
        try {
            await api.post('/admin/users', form);
            setMsg('Admin created successfully.');
            setShowAdd(false);
            setForm(DEFAULT_FORM);
            fetchUsers();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Failed to create admin.'); }
        setSubmitting(false);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSubmitting(true);
        setMsg('');
        try {
            await api.patch(`/admin/users/${editingUser.id}`, {
                powerRank: editingUser.powerRank,
                systemPermissions: editingUser.systemPermissions,
                role: editingUser.role
            });
            setMsg('Admin powers updated successfully.');
            setShowEdit(false);
            fetchUsers();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Failed to update powers.'); }
        setSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-6" style={{ paddingBottom: '4rem' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent pb-1" style={{ fontFamily: 'var(--font-display)' }}>Admin Users</h1>
                    <p className="text-muted-foreground text-base max-w-lg">Manage admin registrations and platform access.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">{users.filter(u => !u.isApproved && u.isActive).length} Pending</span>
                    <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest bg-lime-500/10 text-lime-400 border border-lime-500/20">{users.filter(u => u.isApproved && u.isActive).length} Active</span>
                    <button
                        className="btn btn-primary ml-2 rounded-full px-5 hover:-translate-y-0.5 transition-transform"
                        onClick={() => { setShowAdd(true); setMsg(''); setForm(DEFAULT_FORM); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <UserPlus size={16} strokeWidth={2} />
                        Add Admin
                    </button>
                </div>
            </div>

            {msg && <div className="alert alert-success mb-2 bg-lime-500/10 text-lime-400 border border-lime-500/20 backdrop-blur-sm rounded-lg p-3">{msg}</div>}

            <div className="bento-item p-0 overflow-hidden relative">
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 rounded-full mb-5 border border-indigo-500/20">
                                <Users size={36} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">No admin users found</h3>
                            <p className="text-muted-foreground max-w-md leading-relaxed">No users currently exist or match your criteria in the system.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 backdrop-blur-sm text-white/70 uppercase text-xs font-bold tracking-wider border-b border-white/10">
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th>Rank</th>
                                    <th>Permissions</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y border-white/5">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-5 font-semibold text-foreground">{u.name}</td>
                                        <td className="px-6 py-5 font-mono text-xs text-muted-foreground">{u.email}</td>
                                        <td className="px-6 py-5">
                                            <span className={`text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest ${u.role === 'SUPER_ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-lime-500/10 text-lime-400 border border-lime-500/20'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                                                {u.role === 'SUPER_ADMIN' ? <ShieldCheck size={14} /> : <UserCog size={14} />}
                                                {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {!u.isActive ? (
                                                <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20">Deactivated</span>
                                            ) : u.isApproved ? (
                                                <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest bg-lime-500/10 text-lime-400 border border-lime-500/20">Approved</span>
                                            ) : (
                                                <span className="text-[0.65rem] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 font-mono text-[0.7rem] text-muted-foreground">
                                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-[0.65rem] px-3 py-1 rounded-md font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/80">Rank {u.powerRank}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {u.role === 'SUPER_ADMIN' ? <span className="text-[0.6rem] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase font-bold tracking-wider">ALL</span> :
                                                    u.systemPermissions?.map(p => <span key={p} className="text-[0.6rem] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 uppercase font-bold tracking-wider">{p.replace('_', ' ')}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {u.role !== 'SUPER_ADMIN' && (
                                                <div className="flex justify-end gap-2">
                                                    <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-all text-xs font-semibold"
                                                        onClick={() => { setEditingUser({ ...u, systemPermissions: u.systemPermissions || [] }); setShowEdit(true); setMsg(''); }}>
                                                        <UserCog size={13} /> Edit Powers
                                                    </button>
                                                    {!u.isApproved && u.isActive && (
                                                        <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/20 transition-all text-xs font-semibold" onClick={() => approve(u.id)}>
                                                            <CheckCircle2 size={13} /> Approve
                                                        </button>
                                                    )}
                                                    {u.isActive && (
                                                        <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all text-xs font-semibold" onClick={() => reject(u.id)}>
                                                            {u.isApproved ? <ShieldOff size={13} /> : <XCircle size={13} />}
                                                            {u.isApproved ? 'Deac' : 'Reject'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Admin Modal */}
            {
                showAdd && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
                        <div className="bento-item w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
                                    <UserPlus className="text-primary" size={20} /> Create Admin
                                </h3>
                                <button className="text-muted-foreground hover:text-white transition-colors" onClick={() => setShowAdd(false)}><X size={20} /></button>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                                This admin will be immediately active and pre-approved — no registration flow required.
                            </p>
                            <form onSubmit={createAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Smith" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address *</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@campus.edu" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password * (min 8 chars)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="form-input"
                                            type={showPw ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                            placeholder="Secure password"
                                            style={{ paddingRight: '2.5rem' }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(v => !v)}
                                            style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                        >
                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                                        <option value="ADMIN">Admin</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label className="form-label">Power Rank (0-100)</label>
                                        <input className="form-input" type="number" min="0" max="100" value={form.powerRank} onChange={e => setForm(p => ({ ...p, powerRank: parseInt(e.target.value) || 0 }))} disabled={form.role === 'SUPER_ADMIN'} />
                                        <p className="text-secondary mt-1" style={{ fontSize: '0.75rem' }}>Higher rank = more power over admins.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <label className="form-label">System Permissions</label>
                                        {SYSTEM_PERMS.map(p => (
                                            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                <input type="checkbox" checked={form.systemPermissions.includes(p)} disabled={form.role === 'SUPER_ADMIN'}
                                                    onChange={(e) => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            systemPermissions: e.target.checked ? [...prev.systemPermissions, p] : prev.systemPermissions.filter(x => x !== p)
                                                        }));
                                                    }}
                                                />
                                                {p.replace('_', ' ')}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {msg && !msg.includes('success') && <div className="alert alert-error">{msg}</div>}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <UserPlus size={15} />
                                        {submitting ? 'Creating...' : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Powers Modal */}
            {
                showEdit && editingUser && (
                    <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                        <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <UserCog size={18} /> Edit Powers: {editingUser.name}
                                </h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label className="form-label">Power Rank (0-100)</label>
                                        <input className="form-input" type="number" min="0" max="100"
                                            value={editingUser.powerRank}
                                            onChange={e => setEditingUser(p => p ? ({ ...p, powerRank: parseInt(e.target.value) || 0 }) : null)}
                                            disabled={editingUser.role === 'SUPER_ADMIN'}
                                        />
                                        <p className="text-secondary mt-1" style={{ fontSize: '0.75rem' }}>You can only assign a rank up to your own.</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                                        <label className="form-label">System Permissions</label>
                                        {SYSTEM_PERMS.map(p => (
                                            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                <input type="checkbox" checked={editingUser.systemPermissions.includes(p)} disabled={editingUser.role === 'SUPER_ADMIN'}
                                                    onChange={(e) => {
                                                        setEditingUser(prev => {
                                                            if (!prev) return null;
                                                            return {
                                                                ...prev,
                                                                systemPermissions: e.target.checked
                                                                    ? [...prev.systemPermissions, p]
                                                                    : prev.systemPermissions.filter(x => x !== p)
                                                            };
                                                        });
                                                    }}
                                                />
                                                {p.replace('_', ' ')}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                {msg && !msg.includes('success') && <div className="alert alert-error">{msg}</div>}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Saving...' : 'Save Powers'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
