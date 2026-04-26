import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWatchlist, removeWatch, getAlerts, createAlert } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { Trash2, Bell, TrendingUp, TrendingDown, Plus } from 'lucide-react'

export default function Watchlist() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [items, setItems]   = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [alertForm, setAlertForm] = useState({ symbol: '', price: '', dir: 'above' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    Promise.all([
      getWatchlist().then(r => setItems(r.data)),
      getAlerts().then(r => setAlerts(r.data)),
    ]).finally(() => setLoading(false))
  }, [user])

  const remove = async (symbol) => {
    await removeWatch(symbol)
    setItems(items.filter(i => i.symbol !== symbol))
  }

  const addAlert = async () => {
    if (!alertForm.symbol || !alertForm.price) return
    try {
      await createAlert(alertForm.symbol.toUpperCase(), parseFloat(alertForm.price), alertForm.dir)
      setMsg(`Alert set for ${alertForm.symbol.toUpperCase()} ${alertForm.dir} $${alertForm.price}`)
      setAlertForm({ symbol: '', price: '', dir: 'above' })
      const { data } = await getAlerts()
      setAlerts(data)
    } catch (e) { setMsg(e.response?.data?.error || 'Failed to set alert') }
  }

  const inputStyle = {
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '8px 12px',
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13,
    outline: 'none',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, marginBottom: 6, animation: 'fadeUp 0.3s ease both' }}>
        My Watchlist
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>Track your favourite stocks and set price alerts</p>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--muted)' }}>
          Your watchlist is empty. Search for a stock and add it!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {items.map((item, i) => (
            <div key={item.symbol} onClick={() => navigate(`/stock/${item.symbol}`)} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', animation: `fadeUp 0.3s ease ${i*0.05}s both`,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>
                  {item.symbol}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Added {item.added_at?.slice(0,10)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {item.price && (
                  <span style={{ fontWeight: 700, fontSize: 16 }}>${item.price?.toFixed(2)}</span>
                )}
                <button onClick={e => { e.stopPropagation(); remove(item.symbol) }} style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '5px 8px',
                  color: 'var(--red)', cursor: 'pointer',
                }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alert creator */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        animation: 'fadeUp 0.4s ease 0.2s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Bell size={16} color="var(--accent)" />
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>Set Price Alert</h2>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inputStyle, width: 100 }} placeholder="Symbol" value={alertForm.symbol}
            onChange={e => setAlertForm({ ...alertForm, symbol: e.target.value })} />
          <select style={{ ...inputStyle }} value={alertForm.dir}
            onChange={e => setAlertForm({ ...alertForm, dir: e.target.value })}>
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <input style={{ ...inputStyle, width: 120 }} type="number" placeholder="Target $" value={alertForm.price}
            onChange={e => setAlertForm({ ...alertForm, price: e.target.value })} />
          <button onClick={addAlert} style={{
            padding: '8px 18px', background: 'var(--accent)', color: '#000',
            border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={14} /> Add Alert
          </button>
        </div>

        {msg && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--green)' }}>{msg}</p>}

        {/* Active alerts list */}
        {alerts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>Active alerts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(a => (
                <div key={a.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{a.symbol}</span>
                  <span style={{ color: 'var(--muted)' }}>{a.direction} <strong style={{ color: 'var(--text)' }}>${a.target_price}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
