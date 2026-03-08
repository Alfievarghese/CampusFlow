'use client';

import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('cookie-consent') : null;
        if (!stored) {
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const close = (accepted: boolean) => {
        setExiting(true);
        localStorage.setItem('cookie-consent', accepted ? 'true' : 'false');
        setTimeout(() => setVisible(false), 350);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            style={{
                position: 'fixed',
                bottom: '1.25rem',
                left: '50%',
                transform: `translateX(-50%) translateY(${exiting ? '120%' : '0'})`,
                zIndex: 9999,
                width: '95%',
                maxWidth: '480px',
                opacity: exiting ? 0 : 1,
                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                animation: exiting ? 'none' : 'cookieSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-bright)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Cookie size={20} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, margin: 0 }}>
                        We use cookies to enhance your experience. By continuing to use CampusFlow, you agree to our use of cookies.
                    </p>
                    <button
                        onClick={() => close(false)}
                        aria-label="Dismiss"
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: 4, flexShrink: 0,
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => close(false)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => close(true)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
                    >
                        Accept Cookies
                    </button>
                </div>
            </div>
        </div>
    );
}
