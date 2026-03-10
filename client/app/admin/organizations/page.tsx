'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Building2, PlusCircle, Users, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Org { id: string; name: string; description?: string; isActive: boolean; members?: OrgMember[]; }
interface OrgMember { id: string; userId: string; role: string; permissions: string; user: { id: string; name: string; email: string }; }
interface AdminUser { id: string; name: string; email: string; role: string; }

const PERMISSIONS = [
    { key: 'HOST_EVENTS', label: 'Host Events', desc: 'Create & edit events for this org' },
    { key: 'VIEW_REPORTS', label: 'View Reports', desc: 'View & download post-event reports' },
    { key: 'EDIT_ORG', label: 'Edit Organization', desc: 'Edit org name & description' },
    { key: 'MANAGE_MEMBERS', label: 'Manage Members', desc: 'Add/remove members & set permissions' },
];

export default function OrganizationsPage() {
    const { user } = useAuth();
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState<string | null>(null);
    const [detailOrg, setDetailOrg] = useState<Org | null>(null);
    const [msg, setMsg] = useState('');
    const [form, setForm] = useState({ name: '', description: '' });
    const [editId, setEditId] = useState<string | null>(null);

    // Member management
    const [showAddMember, setShowAddMember] = useState(false);
    const [allAdmins, setAllAdmins] = useState<AdminUser[]>([]);
    const [memberForm, setMemberForm] = useState({ userId: '', role: 'MEMBER', permissions: [] as string[] });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const fetchOrgs = async () => {
        setLoading(true);
        try { const r = await api.get('/orgs'); setOrgs(r.data); } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchOrgs(); }, []);

    const submit = async () => {
        if (!form.name) return setMsg('Organization name is required.');
        try {
            if (editId) {
                await api.patch(`/orgs/${editId}`, form);
                setMsg('Organization updated.');
            } else {
                await api.post('/orgs', form);
                setMsg('Organization created.');
            }
            setShowForm(false); setEditId(null); setForm({ name: '', description: '' }); fetchOrgs();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const openDetail = async (orgId: string) => {
        setShowDetail(orgId);
        try {
            const r = await api.get(`/orgs/${orgId}`);
            setDetailOrg(r.data);
        } catch { }
    };

    const addMember = async () => {
        if (!memberForm.userId || !showDetail) return;
        try {
            await api.post(`/orgs/${showDetail}/members`, {
                userId: memberForm.userId,
                role: memberForm.role,
                permissions: memberForm.permissions,
            });
            setShowAddMember(false);
            setMemberForm({ userId: '', role: 'MEMBER', permissions: [] });
            openDetail(showDetail);
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };



    const removeMember = async (memberId: string) => {
        if (!showDetail) return;
        try {
            await api.delete(`/orgs/${showDetail}/members/${memberId}`);
            openDetail(showDetail);
        } catch { }
    };

    const loadAdmins = async () => {
        if (allAdmins.length > 0) return;
        try {
            const r = await api.get('/admin/users');
            setAllAdmins(r.data.filter((u: any) => u.isApproved && u.isActive));
        } catch { }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Organizations</h1>
                    <p className="page-subtitle">Manage campus organizations and their members</p>
                </div>
                {isSuperAdmin && (
                    <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setMsg(''); setForm({ name: '', description: '' }); }}>
                        <PlusCircle size={16} strokeWidth={1.75} style={{ marginRight: '0.4rem' }} />
                        New Organization
                    </button>
                )}
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
            ) : (
                <div className="grid-3">
                    {orgs.map((org, i) => (
                        <motion.div
                            key={org.id}
                            className={`card anim-slide-up anim-delay-${Math.min(i + 1, 5)}`}
                            whileHover={{ scale: 1.01, y: -2 }}
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDetail(org.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--sky-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={22} strokeWidth={1.5} style={{ color: 'var(--sky)' }} />
                                </div>
                                <span className="badge badge-confirmed">Active</span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{org.name}</h3>
                            {org.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{org.description}</p>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                <ChevronRight size={14} /> View members & permissions
                            </div>
                        </motion.div>
                    ))}
                    {orgs.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <Building2 size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>No organizations yet. {isSuperAdmin ? 'Create the first one above.' : 'Contact a Super Admin to create one.'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Org Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="modal-overlay" onClick={() => setShowForm(false)}>
                        <motion.div className="modal" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <div className="modal-header">
                                <h3>{editId ? 'Edit Organization' : 'New Organization'}</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={16} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Organization Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. CS Department, Cultural Club" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this organization do?" />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={submit}>{editId ? 'Save' : 'Create'}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Org Detail Modal — Members & Permissions */}
            <AnimatePresence>
                {showDetail && detailOrg && (
                    <div className="modal-overlay" onClick={() => { setShowDetail(null); setDetailOrg(null); setShowAddMember(false); }} style={{ zIndex: 9999 }}>
                        <motion.div
                            onClick={e => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            style={{ width: '95%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', background: 'var(--ink)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{detailOrg.name}</h3>
                                    {detailOrg.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{detailOrg.description}</p>}
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setShowDetail(null); setDetailOrg(null); }}><X size={18} /></button>
                            </div>

                            {/* Members Section */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                                    <Users size={16} /> Members ({detailOrg.members?.length || 0})
                                </h4>
                                {isSuperAdmin && (
                                    <button className="btn btn-primary btn-sm" onClick={() => { setShowAddMember(true); loadAdmins(); }}>
                                        <PlusCircle size={14} style={{ marginRight: 4 }} /> Add Member
                                    </button>
                                )}
                            </div>

                            {/* Add Member Form */}
                            {showAddMember && (
                                <div className="card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--surface)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Select Admin User</label>
                                            <select className="form-select" value={memberForm.userId} onChange={e => setMemberForm(p => ({ ...p, userId: e.target.value }))}>
                                                <option value="">— Choose a user —</option>
                                                {allAdmins.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} — {a.email}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Role</label>
                                            <select className="form-select" value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))}>
                                                <option value="MEMBER">Member</option>
                                                <option value="ORG_HEAD">Organization Head</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Permissions</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {PERMISSIONS.map(p => (
                                                    <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={memberForm.permissions.includes(p.key)}
                                                            onChange={() => setMemberForm(prev => ({
                                                                ...prev,
                                                                permissions: prev.permissions.includes(p.key)
                                                                    ? prev.permissions.filter(x => x !== p.key)
                                                                    : [...prev.permissions, p.key]
                                                            }))} />
                                                        {p.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(false)}>Cancel</button>
                                            <button className="btn btn-primary btn-sm" onClick={addMember}>Add</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Member List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {detailOrg.members?.map(member => {
                                    const perms = JSON.parse(member.permissions || '[]');
                                    return (
                                        <div key={member.id} className="card" style={{ padding: '0.9rem 1rem', background: 'var(--surface)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: member.role === 'ORG_HEAD' ? 'var(--amber-glow)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: member.role === 'ORG_HEAD' ? 'var(--amber)' : 'var(--text-secondary)' }}>
                                                        {member.user.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{member.user.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{member.user.email}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span className={`badge ${member.role === 'ORG_HEAD' ? 'badge-pending' : 'badge-confirmed'}`} style={{ fontSize: '0.68rem' }}>
                                                        {member.role === 'ORG_HEAD' ? '👑 Head' : 'Member'}
                                                    </span>
                                                    {isSuperAdmin && (
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem', color: 'var(--rose)' }} onClick={() => removeMember(member.id)}>
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Permissions display */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                {member.role === 'ORG_HEAD' ? (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>ALL PERMISSIONS</span>
                                                ) : (
                                                    perms.length > 0 ? perms.map((p: string) => (
                                                        <span key={p} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'var(--lime-glow)', color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>{p}</span>
                                                    )) : (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No special permissions</span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!detailOrg.members || detailOrg.members.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        No members yet. Add the first member above.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
