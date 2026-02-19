'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isApproved: boolean;
    isActive: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    const fetch = async () => {
        setLoading(true);
        try { const r = await api.get('/admin/users'); setUsers(r.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const approve = async (id: string) => {
        try { await api.patch(`/admin/users/${id}/approve`); setMsg('Admin approved.'); fetch(); }
        catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const reject = async (id: string) => {
        try { await api.patch(`/admin/users/${id}/reject`); setMsg('Admin rejected/deactivated.'); fetch(); }
        catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Admin Users</h1>
                    <p className="page-subtitle">Manage admin registrations and approvals</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span className="badge badge-pending">{users.filter(u => !u.isApproved).length} Pending</span>
                    <span className="badge badge-confirmed">{users.filter(u => u.isApproved && u.isActive).length} Active</span>
                </div>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            <div className="card">
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
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
                                        <td>{u.name}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{u.email}</td>
                                        <td><span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-conflict' : 'badge-confirmed'}`}>{u.role}</span></td>
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
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {u.role !== 'SUPER_ADMIN' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {!u.isApproved && u.isActive && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => approve(u.id)}>Approve</button>
                                                    )}
                                                    {u.isActive && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => reject(u.id)}>
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
        </div>
    );
}
