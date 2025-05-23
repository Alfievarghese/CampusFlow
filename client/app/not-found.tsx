import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '5rem', color: 'var(--lime)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 420 }}>The page you are looking for does not exist or you do not have permission to view it.</p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/" className="btn btn-primary">← Homepage</Link>
        <Link href="/auth/login" className="btn btn-secondary">Admin Login</Link>
      </div>
    </div>
  );
}
