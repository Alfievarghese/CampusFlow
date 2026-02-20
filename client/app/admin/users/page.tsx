'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
    UserPlus, CheckCircle2, XCircle, ShieldCheck, ShieldOff,
    UserCog, Users, X, Eye, EyeOff,
} from 'lucide-react';

interface AdminUser { id: string; name: string; email: string; role: string; isApproved: boolean; isActive: boolean; createdAt: string; }

const DEFAULT_FORM = { name: '', email: '', password: '', role: 'ADMIN' };

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [showAdd, setShowAdd] = useState(false);
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

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Users</h1>
                    <p className="page-subtitle">Manage admin registrations and approvals</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="badge badge-pending">{users.filter(u => !u.isApproved && u.isActive).length} Pending</span>
                    <span className="badge badge-confirmed">{users.filter(u => u.isApproved && u.isActive).length} Active</span>
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowAdd(true); setMsg(''); setForm(DEFAULT_FORM); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <UserPlus size={16} strokeWidth={1.75} />
                        Add Admin
                    </button>
                </div>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            <div className="card">
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <Users size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>No admin users found.</p>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{u.email}</td>
                                        <td>
                                            <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-conflict' : 'badge-confirmed'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                                                {u.role === 'SUPER_ADMIN' ? <ShieldCheck size={11} /> : <UserCog size={11} />}
                                                {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                            </span>
                                        </td>
                                        <td>
                                            {!u.isActive ? (
                                                <span className="badge badge-cancelled">Deactivated</span>
                                            ) : u.isApproved ? (
                                                <span className="badge badge-confirmed">Approved</span>
                                            ) : (
                                                <span className="badge badge-pending">Pending</span>
                                            )}
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            {u.role !== 'SUPER_ADMIN' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {!u.isApproved && u.isActive && (
                                                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => approve(u.id)}>
                                                            <CheckCircle2 size={13} /> Approve
                                                        </button>
                                                    )}
                                                    {u.isActive && (
                                                        <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => reject(u.id)}>
                                                            {u.isApproved ? <ShieldOff size={13} /> : <XCircle size={13} />}
                                                            {u.isApproved ? 'Deactivate' : 'Reject'}
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
            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserPlus size={18} /> Create Admin
                            </h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
                        </div>
                        <p className="text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
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
            )}
        </div>
    );
}
