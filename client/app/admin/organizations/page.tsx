'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Building2, PlusCircle, Users, X, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrgRole { id: string; name: string; permissions: string; powerRank: number; }
interface Org { id: string; name: string; description?: string; isActive: boolean; members?: OrgMember[]; roles?: OrgRole[]; }
interface OrgMember { id: string; userId: string; role: string; orgRoleId?: string; orgRole?: OrgRole; permissions: string; powerRank: number; user: { id: string; name: string; email: string }; }
interface AdminUser { id: string; name: string; email: string; role: string; powerRank: number; systemPermissions: string[]; }

const PERMISSIONS = [
    { key: 'HOST_EVENTS', label: 'Host Events', desc: 'Create & edit events for this org' },
    { key: 'VIEW_REPORTS', label: 'View Reports', desc: 'View & download post-event reports' },
    { key: 'EDIT_ORG', label: 'Edit Organization', desc: 'Edit org name & description' },
    { key: 'MANAGE_MEMBERS', label: 'Manage Members', desc: 'Add/remove members & set permissions' },
    { key: 'ASSIGN_POWERS', label: 'Assign Powers', desc: 'Assign power ranks and system permissions' },
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

    // Member & Role management
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
    const [showAddMember, setShowAddMember] = useState(false);
    const [showEditMember, setShowEditMember] = useState(false);
    const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
    const [allAdmins, setAllAdmins] = useState<AdminUser[]>([]);
    const [memberForm, setMemberForm] = useState({ userId: '', role: 'MEMBER', orgRoleId: '', permissions: [] as string[], powerRank: 0 });

    const [showRoleForm, setShowRoleForm] = useState(false);
    const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', permissions: [] as string[], powerRank: 0 });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isSystemAdmin = user?.role === 'ADMIN' && (user?.systemPermissions?.includes('CREATE_ORGANIZATIONS') || false);

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
        setActiveTab('members');
        try {
            const [rOrg, rRoles] = await Promise.all([
                api.get(`/orgs/${orgId}`),
                api.get(`/orgs/${orgId}/roles`)
            ]);
            setDetailOrg({ ...rOrg.data, roles: rRoles.data });
        } catch { }
    };

    const addMember = async () => {
        if (!memberForm.userId || !showDetail) return;
        try {
            await api.post(`/orgs/${showDetail}/members`, {
                userId: memberForm.userId,
                role: memberForm.role,
                orgRoleId: memberForm.orgRoleId || null,
                permissions: memberForm.permissions,
                powerRank: memberForm.powerRank
            });
            setShowAddMember(false);
            setMemberForm({ userId: '', role: 'MEMBER', orgRoleId: '', permissions: [], powerRank: 0 });
            openDetail(showDetail);
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const updateMember = async () => {
        if (!editingMember || !showDetail) return;
        try {
            await api.patch(`/orgs/${showDetail}/members/${editingMember.id}`, {
                role: editingMember.role,
                orgRoleId: editingMember.orgRoleId || '',
                permissions: JSON.parse(editingMember.permissions || '[]'),
                powerRank: editingMember.powerRank
            });
            setShowEditMember(false);
            setEditingMember(null);
            openDetail(showDetail);
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error updating member.'); }
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

    const submitRole = async () => {
        if (!showDetail || !roleForm.name) return;
        try {
            if (editingRole) {
                await api.patch(`/orgs/${showDetail}/roles/${editingRole.id}`, roleForm);
            } else {
                await api.post(`/orgs/${showDetail}/roles`, roleForm);
            }
            setShowRoleForm(false);
            setEditingRole(null);
            setRoleForm({ name: '', permissions: [], powerRank: 0 });
            openDetail(showDetail);
        } catch (e: any) { setMsg(e.response?.data?.error || 'Role error'); }
    };

    const deleteRole = async (roleId: string) => {
        if (!showDetail) return;
        try {
            await api.delete(`/orgs/${showDetail}/roles/${roleId}`);
            openDetail(showDetail);
        } catch (e: any) { setMsg(e.response?.data?.error || 'Delete error'); }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent pb-1">Organizations</h1>
                    <p className="text-muted-foreground text-base max-w-lg">Manage campus organizations and their members.</p>
                </div>
                {(isSuperAdmin || isSystemAdmin) && (
                    <button className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 text-sm font-bold" onClick={() => { setShowForm(true); setEditId(null); setMsg(''); setForm({ name: '', description: '' }); }}>
                        <PlusCircle size={18} strokeWidth={2} />
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
                            className={`bento-item hover:bg-white/[0.03] transition-colors anim-slide-up anim-delay-${Math.min(i + 1, 5)}`}
                            whileHover={{ scale: 1.02, y: -2 }}
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDetail(org.id)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-11 h-11 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-sm">
                                    <Building2 size={22} className="text-sky-400" />
                                </div>
                                <span className="text-[0.65rem] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest bg-lime-500/10 text-lime-400 border border-lime-500/20">
                                    Active
                                </span>
                            </div>
                            <h3 className="font-display text-lg font-bold mb-2 text-foreground">{org.name}</h3>
                            {org.description && <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">{org.description}</p>}
                            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider mt-auto pt-4 border-t border-border/50 transition-colors">
                                View members & permissions <ChevronRight size={14} />
                            </div>
                        </motion.div>
                    ))}
                    {orgs.length === 0 && (
                        <div style={{ gridColumn: '1/-1' }} className="flex flex-col items-center justify-center p-20 text-center relative overflow-hidden bento-item mt-4">
                            <div className="absolute inset-0 bg-secondary/5 pointer-events-none"></div>
                            <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 p-5 rounded-full mb-5 border border-sky-500/20">
                                <Building2 size={36} className="text-sky-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">No organizations yet</h3>
                            <p className="text-muted-foreground max-w-md leading-relaxed mb-4">{isSuperAdmin ? 'Ready to get started? Create the first campus organization above.' : 'Contact a Super Admin to create a new organization.'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Org Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowForm(false)}>
                        <motion.div className="bento-item max-w-md w-full p-6 shadow-2xl scale-100" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Building2 size={20} className="text-sky-500" />
                                    {editId ? 'Edit Organization' : 'New Organization'}
                                </h3>
                                <button className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full p-1 transition-colors" onClick={() => setShowForm(false)}><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organization Name *</label>
                                    <input className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. CS Department, Cultural Club" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                                    <textarea className="flex min-h-[80px] w-full rounded-2xl border border-input bg-secondary/30 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this organization do?" />
                                </div>
                                {msg && <div className="text-rose-400 text-sm font-medium p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">{msg}</div>}
                                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border/50">
                                    <button className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-sm font-bold transition-colors" onClick={() => setShowForm(false)}>Cancel</button>
                                    <button className="h-10 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 text-sm font-bold" onClick={submit}>{editId ? 'Save' : 'Create'}</button>
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

                            <div className="flex border-b border-border/50 mb-6 gap-6">
                                <button
                                    className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'members' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('members')}
                                >
                                    <Users size={16} /> Members ({detailOrg?.members?.length || 0})
                                </button>
                                <button
                                    className={`pb-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'roles' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActiveTab('roles')}
                                >
                                    <Shield size={16} /> Roles ({detailOrg?.roles?.length || 0})
                                </button>
                            </div>

                            {activeTab === 'members' && (
                                <div className="space-y-4">
                                    {/* Members Section Header */}
                                    <div className="flex items-center justify-end mb-2">
                                        {(isSuperAdmin || isSystemAdmin || user?.orgMemberships?.some((m: any) => m.organizationId === detailOrg.id && (m.role === 'ORG_HEAD' || m.permissions.includes('MANAGE_MEMBERS') || m.permissions.includes('ASSIGN_POWERS')))) && (
                                            <button className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10 transition-colors text-xs font-bold" onClick={() => { setShowAddMember(true); loadAdmins(); }}>
                                                <PlusCircle size={14} /> Add Member
                                            </button>
                                        )}
                                    </div>

                                    {/* Add Member Form */}
                                    {showAddMember && (
                                        <div className="p-4 rounded-xl border border-white/10 bg-white/5 shadow-inner mb-4 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Admin User</label>
                                                <select className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground" value={memberForm.userId} onChange={e => setMemberForm(p => ({ ...p, userId: e.target.value }))}>
                                                    <option value="" className="bg-ink text-foreground">— Choose a user —</option>
                                                    {allAdmins.map(a => (
                                                        <option key={a.id} value={a.id} className="bg-ink text-foreground">{a.name} — {a.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                                                <select
                                                    className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground"
                                                    value={memberForm.orgRoleId ? `CUSTOM_${memberForm.orgRoleId}` : memberForm.role}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val.startsWith('CUSTOM_')) {
                                                            const rid = val.replace('CUSTOM_', '');
                                                            const r = detailOrg?.roles?.find(x => x.id === rid);
                                                            setMemberForm(p => ({ ...p, role: 'MEMBER', orgRoleId: rid, permissions: r ? JSON.parse(r.permissions) : [], powerRank: r ? r.powerRank : 0 }));
                                                        } else {
                                                            setMemberForm(p => ({ ...p, role: val, orgRoleId: '' }));
                                                        }
                                                    }}
                                                >
                                                    <option value="MEMBER" className="bg-ink text-foreground">Member (No custom role)</option>
                                                    <option value="ORG_HEAD" className="bg-ink text-foreground">Organization Head</option>
                                                    {detailOrg?.roles?.length ? <option disabled className="bg-ink text-muted-foreground">──────────</option> : null}
                                                    {detailOrg?.roles?.map(r => (
                                                        <option key={r.id} value={`CUSTOM_${r.id}`} className="bg-ink text-foreground">{r.name} (Rank: {r.powerRank})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PERMISSIONS.map(p => (
                                                        <label key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                                            <input type="checkbox" checked={memberForm.permissions.includes(p.key)} disabled={memberForm.role === 'ORG_HEAD'} className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
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
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Power Rank (0-100) within Org</label>
                                                <input className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground" type="number" min="0" max="100" value={memberForm.powerRank} onChange={e => setMemberForm(p => ({ ...p, powerRank: parseInt(e.target.value) || 0 }))} disabled={memberForm.role === 'ORG_HEAD'} />
                                                <p className="text-xs text-muted-foreground mt-1">Limits which org members you can modify.</p>
                                            </div>
                                            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-border/30">
                                                <button className="h-9 px-4 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold transition-colors" onClick={() => setShowAddMember(false)}>Cancel</button>
                                                <button className="h-9 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 text-xs font-bold" onClick={addMember}>Add</button>
                                            </div>
                                        </div>
                                    )}

                                {/* Edit Member Form */}
                                {showEditMember && editingMember && (
                                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 shadow-inner mb-4 space-y-4">
                                        <h4 className="font-bold text-foreground">Editing: {editingMember.user.name}</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                                                <select
                                                    className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground"
                                                    value={editingMember.orgRoleId ? `CUSTOM_${editingMember.orgRoleId}` : editingMember.role}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val.startsWith('CUSTOM_')) {
                                                            const rid = val.replace('CUSTOM_', '');
                                                            const r = detailOrg?.roles?.find(x => x.id === rid);
                                                            setEditingMember(p => p ? ({ ...p, role: 'MEMBER', orgRoleId: rid, permissions: r ? r.permissions : '[]', powerRank: r ? r.powerRank : 0 }) : null);
                                                        } else {
                                                            setEditingMember(p => p ? ({ ...p, role: val, orgRoleId: '' }) : null);
                                                        }
                                                    }}
                                                >
                                                    <option value="MEMBER" className="bg-ink text-foreground">Member (No custom role)</option>
                                                    <option value="ORG_HEAD" className="bg-ink text-foreground">Organization Head</option>
                                                    {detailOrg?.roles?.length ? <option disabled className="bg-ink text-muted-foreground">──────────</option> : null}
                                                    {detailOrg?.roles?.map(r => (
                                                        <option key={r.id} value={`CUSTOM_${r.id}`} className="bg-ink text-foreground">{r.name} (Rank: {r.powerRank})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PERMISSIONS.map(p => {
                                                        const currentPerms = JSON.parse(editingMember.permissions || '[]');
                                                        return (
                                                            <label key={p.key} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                                                                <input type="checkbox" checked={currentPerms.includes(p.key)} disabled={editingMember.role === 'ORG_HEAD'} className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                                                                    onChange={() => setEditingMember(prev => {
                                                                        if (!prev) return null;
                                                                        const updatedPerms = currentPerms.includes(p.key)
                                                                            ? currentPerms.filter((x: string) => x !== p.key)
                                                                            : [...currentPerms, p.key];
                                                                        return { ...prev, permissions: JSON.stringify(updatedPerms) };
                                                                    })} />
                                                                {p.label}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Power Rank (0-100) within Org</label>
                                                <input className="flex h-11 w-full rounded-full border border-input bg-secondary/30 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary shadow-inner text-foreground" type="number" min="0" max="100" value={editingMember.powerRank} onChange={e => setEditingMember(p => p ? ({ ...p, powerRank: parseInt(e.target.value) || 0 }) : null)} disabled={editingMember.role === 'ORG_HEAD'} />
                                                <p className="text-xs text-muted-foreground mt-1">Limits which org members they can modify.</p>
                                            </div>
                                            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-border/30">
                                                <button className="h-9 px-4 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold transition-colors" onClick={() => setEditingMember(null)}>Cancel</button>
                                                <button className="h-9 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-0.5 text-xs font-bold" onClick={updateMember}>Save Power Updates</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Member List */}
                                <div className="space-y-3">
                                    {detailOrg?.members?.map(member => {
                                        const perms = JSON.parse(member.permissions || '[]');
                                        return (
                                            <div key={member.id} className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${member.role === 'ORG_HEAD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-muted-foreground border-white/10'}`}>
                                                            {member.user.name[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-sm text-foreground">{member.user.name}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{member.user.email}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[0.65rem] px-2 py-1 rounded-full font-bold uppercase tracking-widest ${member.role === 'ORG_HEAD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/10 text-muted-foreground border border-white/20'}`}>
                                                            {member.role === 'ORG_HEAD' ? '👑 Head' : member.orgRoleId ? (detailOrg?.roles?.find(x => x.id === member.orgRoleId)?.name || 'Custom') : 'Member'}
                                                        </span>
                                                        <span className="text-[0.65rem] px-2 py-1 rounded-md font-bold uppercase tracking-widest bg-white/5 text-white/50">
                                                            Rank {member.orgRoleId ? (detailOrg?.roles?.find(x => x.id === member.orgRoleId)?.powerRank || member.powerRank) : member.powerRank}
                                                        </span>
                                                        {(isSuperAdmin || (user?.orgMemberships?.find((m: any) => m.organizationId === detailOrg.id)?.permissions?.includes('ASSIGN_POWERS') || user?.orgMemberships?.find((m: any) => m.organizationId === detailOrg.id)?.role === 'ORG_HEAD')) && (
                                                            <div className="flex items-center ml-1 opacity-60 hover:opacity-100 transition-opacity">
                                                                <button className="p-1.5 text-muted-foreground hover:text-sky-400 hover:bg-white/10 rounded-full transition-colors" onClick={() => { setEditingMember(member); setShowEditMember(true); }}>
                                                                    <Users size={14} />
                                                                </button>
                                                                <button className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors" onClick={() => removeMember(member.id)}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Permissions display */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {member.role === 'ORG_HEAD' ? (
                                                        <span className="text-[0.65rem] font-mono text-amber-500/70 border-b border-amber-500/30 border-dashed pb-0.5 mt-0.5">ALL PERMISSIONS (ORG HEAD)</span>
                                                    ) : (
                                                        (member.orgRoleId ? JSON.parse(detailOrg?.roles?.find(x => x.id === member.orgRoleId)?.permissions || '[]') : perms).length > 0 ? (member.orgRoleId ? JSON.parse(detailOrg?.roles?.find(x => x.id === member.orgRoleId)?.permissions || '[]') : perms).map((p: string) => (
                                                            <span key={p} className="text-[0.6rem] px-1.5 py-0.5 rounded border font-mono bg-lime-500/10 text-lime-400 border-lime-500/20">{p}</span>
                                                        )) : (
                                                            <span className="text-[0.65rem] text-white/30 italic">No special permissions</span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!detailOrg?.members || detailOrg.members.length === 0) && (
                                        <div className="text-center p-8 text-sm text-muted-foreground border border-dashed border-white/10 rounded-2xl">
                                            No members yet. Add the first member above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                            {activeTab === 'roles' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => { setShowRoleForm(true); setEditingRole(null); setRoleForm({ name: '', permissions: [], powerRank: 0 }); }}>
                                            <PlusCircle size={14} style={{ marginRight: 4 }} /> New Role
                                        </button>
                                    </div>

                                    {showRoleForm && (
                                        <div className="card" style={{ padding: '1rem', background: 'var(--surface)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <h4 style={{ margin: 0 }}>{editingRole ? 'Edit Role' : 'Create Role'}</h4>
                                                <div className="form-group">
                                                    <label className="form-label">Role Name *</label>
                                                    <input className="form-input" value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Treasurer" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Permissions</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {PERMISSIONS.map(p => (
                                                            <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                                <input type="checkbox" checked={roleForm.permissions.includes(p.key)}
                                                                    onChange={() => setRoleForm(prev => ({
                                                                        ...prev,
                                                                        permissions: prev.permissions.includes(p.key) ? prev.permissions.filter(x => x !== p.key) : [...prev.permissions, p.key]
                                                                    }))} />
                                                                {p.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Power Rank (0-100) *</label>
                                                    <input className="form-input" type="number" min="0" max="100" value={roleForm.powerRank} onChange={e => setRoleForm(p => ({ ...p, powerRank: parseInt(e.target.value) || 0 }))} />
                                                    <p className="text-secondary mt-1" style={{ fontSize: '0.75rem' }}>Members given this role will receive this rank.</p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowRoleForm(false)}>Cancel</button>
                                                    <button className="btn btn-primary btn-sm" onClick={submitRole}>{editingRole ? 'Save' : 'Create'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {detailOrg?.roles?.map(role => {
                                        const rPerms = JSON.parse(role.permissions || '[]');
                                        return (
                                            <div key={role.id} className="card" style={{ padding: '0.9rem 1rem', background: 'var(--surface)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{role.name}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span className="badge" style={{ background: 'var(--surface-hover)', borderRadius: '4px', fontSize: '0.68rem' }}>Rank {role.powerRank}</span>
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem', color: 'var(--text-secondary)' }} onClick={() => { setEditingRole(role); setRoleForm({ name: role.name, permissions: rPerms, powerRank: role.powerRank }); setShowRoleForm(true); }}>
                                                            <Users size={14} /> Edit
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem', color: 'var(--rose)' }} onClick={() => deleteRole(role.id)}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                                    {rPerms.length > 0 ? rPerms.map((p: string) => (
                                                        <span key={p} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: 'var(--lime-glow)', color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>{p}</span>
                                                    )) : <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No permissions</span>}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(!detailOrg?.roles || detailOrg.roles.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            No custom roles mapped yet.
                                        </div>
                                    )}
                                </div>
                            )}

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
