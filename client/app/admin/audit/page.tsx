'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Log { id: string; action: string; targetId?: string; details?: string; timestamp: string; user?: { name: string; email: string }; }

export default function AuditPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const LIMIT = 30;

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const r = await api.get(`/audit?page=${page}&limit=${LIMIT}`);
                setLogs(r.data.logs);
                setTotal(r.data.total);
            } catch { }
            setLoading(false);
        };
        load();
    }, [page]);

    const actionColor = (action: string) => {
        if (action.includes('CANCEL')) return 'var(--rose)';
        if (action.includes('APPROVED') || action.includes('CREATED')) return 'var(--lime)';
        if (action.includes('REQUESTED') || action.includes('PENDING')) return 'var(--amber)';
        return 'var(--text-secondary)';
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <p className="page-subtitle">Complete record of all system actions · {total} total entries</p>
                </div>
            </div>

            <div className="card">
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Target ID</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(log.timestamp).toLocaleString('en-IN')}
                                        </td>
                                        <td>{log.user?.name || <span style={{ color: 'var(--text-muted)' }}>System</span>}</td>
                                        <td>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: actionColor(log.action), fontWeight: 600 }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.targetId || '—'}
                                        </td>
                                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                            {log.details ? (() => {
                                                try { const d = JSON.parse(log.details!); return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', '); }
                                                catch { return log.details; }
                                            })() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* Pagination */}
                {total > LIMIT && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
                            Page {page} of {Math.ceil(total / LIMIT)}
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}>Next →</button>
                    </div>
                )}
            </div>
        </div>
    );
}
