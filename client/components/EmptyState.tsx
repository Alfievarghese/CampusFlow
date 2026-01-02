interface Props { icon?: string; title: string; description?: string; children?: React.ReactNode; }

export default function EmptyState({ icon = '📭', title, description, children }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>{description}</p>}
      {children}
    </div>
  );
}
