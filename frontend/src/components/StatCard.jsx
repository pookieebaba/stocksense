export default function StatCard({ label, value, sub, color, style = {} }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'border-color 0.2s',
      ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700,
        color: color || 'var(--text)', lineHeight: 1,
      }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
    </div>
  )
}
