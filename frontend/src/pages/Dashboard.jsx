import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuote, getHistory } from '../api/client'
import PriceChart from '../components/PriceChart'
import StatCard from '../components/StatCard'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

const TOP_STOCKS = ['AAPL','MSFT','GOOGL','TSLA','NVDA','META','AMZN','NFLX']

export default function Dashboard() {
  const navigate = useNavigate()
  const [quotes, setQuotes]   = useState({})
  const [history, setHistory] = useState([])
  const [active, setActive]   = useState('AAPL')
  const [loading, setLoading] = useState(true)

  // Fetch all quotes
  useEffect(() => {
    TOP_STOCKS.forEach(async sym => {
      try {
        const { data } = await getQuote(sym)
        setQuotes(q => ({ ...q, [sym]: data }))
      } catch {}
    })
  }, [])

  // Fetch chart data for active stock
  useEffect(() => {
    setLoading(true)
    getHistory(active, '3mo', '1d')
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [active])

  const activeQuote = quotes[active] || {}
  const lastClose   = activeQuote.close || 0
  const prevClose   = history.length > 1 ? history[history.length - 2]?.close : lastClose
  const change      = lastClose - (prevClose || lastClose)
  const changePct   = prevClose ? (change / prevClose * 100) : 0
  const isUp        = change >= 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
          Market Dashboard
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          Real-time prices · AI predictions · Live alerts
        </p>
      </div>

      {/* Stock ticker row */}
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 28,
        scrollbarWidth: 'none',
      }}>
        {TOP_STOCKS.map((sym, i) => {
          const q   = quotes[sym]
          const isA = sym === active
          return (
            <button key={sym} onClick={() => setActive(sym)} style={{
              flexShrink: 0, padding: '10px 18px',
              background: isA ? 'rgba(0,212,255,0.1)' : 'var(--card)',
              border: `1px solid ${isA ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', cursor: 'pointer',
              color: isA ? 'var(--accent)' : 'var(--text)',
              fontFamily: 'var(--font-mono)', textAlign: 'left',
              transition: 'all 0.15s',
              animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{sym}</div>
              {q ? (
                <div style={{ fontSize: 12, color: q.close > 0 ? 'var(--green)' : 'var(--muted)', marginTop: 2 }}>
                  ${q.close?.toFixed(2) || '—'}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Loading…</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          label="Current Price"
          value={lastClose ? `$${lastClose.toFixed(2)}` : '—'}
          sub={`${active} · Live`}
          color="var(--accent)"
          style={{ animation: 'fadeUp 0.35s ease 0.1s both' }}
        />
        <StatCard
          label="Change"
          value={change ? `${isUp ? '+' : ''}${change.toFixed(2)}` : '—'}
          sub={`${changePct.toFixed(2)}% today`}
          color={isUp ? 'var(--green)' : 'var(--red)'}
          style={{ animation: 'fadeUp 0.35s ease 0.15s both' }}
        />
        <StatCard
          label="Day High"
          value={activeQuote.high ? `$${activeQuote.high.toFixed(2)}` : '—'}
          sub="Intraday high"
          style={{ animation: 'fadeUp 0.35s ease 0.2s both' }}
        />
        <StatCard
          label="Day Low"
          value={activeQuote.low ? `$${activeQuote.low.toFixed(2)}` : '—'}
          sub="Intraday low"
          style={{ animation: 'fadeUp 0.35s ease 0.25s both' }}
        />
        <StatCard
          label="Volume"
          value={activeQuote.volume ? `${(activeQuote.volume / 1e6).toFixed(1)}M` : '—'}
          sub="Shares traded"
          style={{ animation: 'fadeUp 0.35s ease 0.3s both' }}
        />
      </div>

      {/* Chart */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        animation: 'fadeUp 0.4s ease 0.2s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>
              {active} Price History
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>Last 3 months · Daily close</p>
          </div>
          <button onClick={() => navigate(`/stock/${active}`)} style={{
            padding: '7px 16px', background: 'transparent',
            border: '1px solid var(--accent)', color: 'var(--accent)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Activity size={14} /> Deep Analysis →
          </button>
        </div>

        {loading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            Loading chart data…
          </div>
        ) : (
          <PriceChart data={history} height={280} />
        )}
      </div>

      {/* Quick links grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {[
          { title: 'AI Predictions', desc: 'LSTM price forecast for next 7 days', path: `/stock/${active}`, icon: '🤖' },
          { title: 'My Watchlist',   desc: 'Track your favourite stocks', path: '/watchlist', icon: '⭐' },
        ].map(({ title, desc, path, icon }) => (
          <div key={title} onClick={() => navigate(path)} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'border-color 0.15s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            <span style={{ fontSize: 28 }}>{icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>{title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
