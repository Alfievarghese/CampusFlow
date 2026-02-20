'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { InboxIcon, SendHorizontal, CheckCircle2, XCircle, RotateCcw, MessageSquare, X } from 'lucide-react';

interface ConflictReq {
    id: string; status: string; reason: string; comment?: string;
    newEventTitle: string; newEventStart: string; newEventEnd: string; createdAt: string;
    requestedBy: { name: string; email: string };
    event: { id: string; title: string; startTime: string; endTime: string; hall: { name: string }; creator: { name: string; email: string }; };
}
interface InviteReq {
    id: string; status: string; requesterName: string; requesterEmail: string;
    requesterInfo?: string; createdAt: string; event: { id: string; title: string };
}

function formatDT(d: string) { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function RequestsPage() {
    const { user } = useAuth();
    const [conflicts, setConflicts] = useState<ConflictReq[]>([]);
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [outgoing, setOutgoing] = useState<ConflictReq[]>([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState<{ id: string; type: 'conflict'; } | null>(null);
    const [comment, setComment] = useState('');
    const [msg, setMsg] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [inc, out] = await Promise.all([
                api.get('/conflicts'),
                api.get('/conflicts/my-outgoing'),
            ]);
            setConflicts(inc.data);
            setOutgoing(out.data);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const respondConflict = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/conflicts/${id}`, { status, comment });
            setMsg(`Override request ${status.toLowerCase()}.`);
            setResponding(null);
            setComment('');
            loadData();
        } catch (e: any) { setMsg(e.response?.data?.error || 'Error'); }
    };

    const pendingCount = conflicts.filter(r => r.status === 'PENDING').length;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Requests</h1>
                    <p className="page-subtitle">Conflict override and invite requests</p>
                </div>
            </div>

            {msg && <div className="alert alert-success mb-2">{msg}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${activeTab === 'incoming' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setActiveTab('incoming')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <InboxIcon size={14} strokeWidth={1.75} />
                    Incoming {pendingCount > 0 && <span className="sidebar-link-badge" style={{ position: 'static' }}>{pendingCount}</span>}
                </button>
                <button
                    className={`btn ${activeTab === 'outgoing' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setActiveTab('outgoing')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <SendHorizontal size={14} strokeWidth={1.75} />
                    My Requests
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
            ) : activeTab === 'incoming' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {conflicts.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <InboxIcon size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>No incoming conflict requests.</p>
                        </div>
                    ) : conflicts.map(req => (
                        <div key={req.id} className="card">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                                        {req.requestedBy.name} wants your slot
                                    </div>
                                    <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {formatDT(req.createdAt)}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'var(--ink-3)', padding: '0.85rem', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>YOUR EVENT</div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{req.event.title}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{formatDT(req.event.startTime)}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>Hall: {req.event.hall.name}</div>
                                </div>
                                <div style={{ background: 'rgba(96,189,255,0.07)', padding: '0.85rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', border: '1px solid rgba(96,189,255,0.15)' }}>
                                    <div style={{ color: 'var(--sky)', marginBottom: '0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>REQUESTING FOR</div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{req.newEventTitle}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>{formatDT(req.newEventStart)}</div>
                                    <div style={{ color: 'var(--text-secondary)' }}>by {req.requestedBy.name}</div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--ink-3)', padding: '0.85rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>REASON</div>
                                <div style={{ color: 'var(--text-secondary)' }}>{req.reason}</div>
                            </div>

                            {req.status === 'PENDING' && (
                                responding?.id === req.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <MessageSquare size={13} /> Optional comment
                                            </label>
                                            <textarea className="form-textarea" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a note..." />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={() => respondConflict(req.id, 'APPROVED')}>
                                                <CheckCircle2 size={15} /> Approve (Cancel My Event)
                                            </button>
                                            <button className="btn btn-danger" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={() => respondConflict(req.id, 'REJECTED')}>
                                                <XCircle size={15} /> Reject
                                            </button>
                                            <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setResponding(null)}>
                                                <RotateCcw size={14} /> Back
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="btn btn-secondary btn-sm" onClick={() => setResponding({ id: req.id, type: 'conflict' })}>
                                        Respond to Request
                                    </button>
                                )
                            )}

                            {req.comment && (
                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--lime-glow)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--lime)' }}>
                                    Response: {req.comment}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {outgoing.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            <SendHorizontal size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>You haven't submitted any override requests.</p>
                        </div>
                    ) : outgoing.map(req => (
                        <div key={req.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Request for: {req.newEventTitle}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        Conflicting with: <strong>{req.event.title}</strong> (by {req.event.creator.name})
                                    </div>
                                </div>
                                <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Reason: {req.reason}</div>
                            {req.comment && (
                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--ink-3)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                                    Their response: <em>{req.comment}</em>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
