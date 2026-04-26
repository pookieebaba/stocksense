import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { searchStocks } from '../api/client'
import { Search, Bell, LogOut, TrendingUp, Star } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)

  const handleSearch = async (e) => {
    const q = e.target.value
    setQuery(q)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    try {
      const { data } = await searchStocks(q)
      setResults(data.slice(0, 6))
      setOpen(true)
    } catch { setResults([]) }
  }

  const pick = (symbol) => {
    setQuery(''); setResults([]); setOpen(false)
    navigate(`/stock/${symbol}`)
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={20} color="var(--accent)" />
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          StockSense
        </span>
      </Link>

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
        <Search size={14} color="var(--muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={query}
          onChange={handleSearch}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search stocks... (AAPL, Tesla)"
          style={{
            width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '6px 12px 6px 32px',
            color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13,
            outline: 'none',
          }}
        />
        {open && results.length > 0 && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, right: 0,
            background: 'var(--card)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)', overflow: 'hidden', zIndex: 200,
          }}>
            {results.map(r => (
              <div key={r.symbol} onMouseDown={() => pick(r.symbol)} style={{
                padding: '10px 14px', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.symbol}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        {[{ to: '/', label: 'Dashboard' }, { to: '/watchlist', label: 'Watchlist' }].map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: '6px 14px', borderRadius: 'var(--radius)', textDecoration: 'none',
            fontSize: 13, fontFamily: 'var(--font-mono)',
            color: isActive(to) ? 'var(--accent)' : 'var(--muted)',
            background: isActive(to) ? 'rgba(0,212,255,0.08)' : 'transparent',
            border: isActive(to) ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
            transition: 'all 0.15s',
          }}>{label}</Link>
        ))}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{user.name}</span>
            <button onClick={logout} title="Logout" style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              color: 'var(--muted)', cursor: 'pointer', padding: '5px 8px', display: 'flex',
            }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link to="/login" style={{
            marginLeft: 8, padding: '6px 16px', background: 'var(--accent)',
            color: '#000', borderRadius: 'var(--radius)', textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
          }}>Login</Link>
        )}
      </div>
    </nav>
  )
}
