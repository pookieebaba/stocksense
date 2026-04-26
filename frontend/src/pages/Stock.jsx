import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getQuote, getHistory, getPrediction, trainModel, modelStatus, addToWatch } from '../api/client'
import PriceChart from '../components/PriceChart'
import StatCard from '../components/StatCard'
import { Brain, Star, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

const PERIODS = [
  { label: '1W', period: '5d',  interval: '1h' },
  { label: '1M', period: '1mo', interval: '1d' },
  { label: '3M', period: '3mo', interval: '1d' },
  { label: '6M', period: '6mo', interval: '1d' },
  { label: '1Y', period: '1y',  interval: '1d' },
]

export default function StockPage() {
  const { symbol } = useParams()
  const SYM = symbol?.toUpperCase()

  const [quote, setQuote]         = useState(null)
  const [history, setHistory]     = useState([])
  const [prediction, setPred]     = useState(null)
  const [predStatus, setPredStatus] = useState('idle') // idle|loading|training|done|error
  const [period, setPeriod]       = useState(PERIODS[2])
  const [added, setAdded]         = useState(false)
  const [chartMode, setChartMode] = useState('actual') // actual|combined

  useEffect(() => {
    getQuote(SYM).then(r => setQuote(r.data)).catch(() => {})
    loadHistory()
    loadPrediction()
  }, [SYM])

  useEffect(() => { loadHistory() }, [period])

  const loadHistory = () => {
    getHistory(SYM, period.period, period.interval)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]))
  }

  const loadPrediction = async () => {
    setPredStatus('loading')
    try {
      const { data, status } = await getPrediction(SYM, 7).catch(e => e.response)
      if (status === 202) {
        setPredStatus('training')
        pollStatus()
      } else {
        setPred(data)
        setPredStatus('done')
      }
    } catch { setPredStatus('error') }
  }

  const pollStatus = () => {
    const iv = setInterval(async () => {
      try {
        const { data } = await modelStatus(SYM)
        if (data.trained) {
          clearInterval(iv)
          loadPrediction()
        }
      } catch { clearInterval(iv); setPredStatus('error') }
    }, 5000)
  }

  const retrain = async () => {
    setPredStatus('training')
    await trainModel(SYM)
    pollStatus()
  }

  const addWatch = async () => {
    try { await addToWatch(SYM); setAdded(true) } catch {}
  }

  const predRows = prediction?.predictions || []
  const chartHistory = history.map(d => ({ ...d, date: d.date?.slice(0, 10) }))
  const chartPred = predRows.map((p, i) => ({
    date: `Day +${p.day}`, price: p.price, close: p.price,
  }))

  const isUp = prediction?.trend === 'up'
  const isDown = prediction?.trend === 'down'

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, letterSpacing: '-1px' }}>{SYM}</h1>
            {prediction && (
              <span style={{
                padding: '4px 12px', borderRadius: 99,
                background: isUp ? 'rgba(0,230,118,0.12)' : isDown ? 'rgba(255,77,109,0.12)' : 'rgba(90,122,154,0.12)',
                border: `1px solid ${isUp ? 'var(--green)' : isDown ? 'var(--red)' : 'var(--muted)'}`,
                color: isUp ? 'var(--green)' : isDown ? 'var(--red)' : 'var(--muted)',
                fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
                {prediction.trend?.toUpperCase()} TREND
              </span>
            )}
          </div>
          {quote && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Live price · {new Date().toLocaleDateString()}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addWatch} style={{
            padding: '8px 16px', background: added ? 'rgba(0,230,118,0.1)' : 'var(--card)',
            border: `1px solid ${added ? 'var(--green)' : 'var(--border)'}`,
            color: added ? 'var(--green)' : 'var(--muted)',
            borderRadius: 'var(--radius)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Star size={14} /> {added ? 'Watching' : 'Add to Watchlist'}
          </button>
          <button onClick={retrain} style={{
            padding: '8px 14px', background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 'var(--radius)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <RefreshCw size={13} /> Retrain
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {quote && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard label="Price"  value={`$${quote.close?.toFixed(2)}`} color="var(--accent)" />
          <StatCard label="Open"   value={`$${quote.open?.toFixed(2)}`} />
          <StatCard label="High"   value={`$${quote.high?.toFixed(2)}`} color="var(--green)" />
          <StatCard label="Low"    value={`$${quote.low?.toFixed(2)}`}  color="var(--red)" />
          <StatCard label="Volume" value={`${quote.volume ? (quote.volume/1e6).toFixed(1)+'M' : '—'}`} />
        </div>
      )}

      {/* Chart section */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 20,
        animation: 'fadeUp 0.4s ease 0.1s both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map(p => (
              <button key={p.label} onClick={() => setPeriod(p)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius)',
                background: period.label === p.label ? 'rgba(0,212,255,0.12)' : 'transparent',
                border: `1px solid ${period.label === p.label ? 'var(--accent)' : 'var(--border)'}`,
                color: period.label === p.label ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
              }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['actual','combined'].map(m => (
              <button key={m} onClick={() => setChartMode(m)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius)',
                background: chartMode === m ? 'rgba(0,230,118,0.1)' : 'transparent',
                border: `1px solid ${chartMode === m ? 'var(--green)' : 'var(--border)'}`,
                color: chartMode === m ? 'var(--green)' : 'var(--muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
              }}>{m === 'actual' ? 'Actual' : '+ AI Prediction'}</button>
            ))}
          </div>
        </div>

        <PriceChart
          data={chartHistory}
          predictionData={chartMode === 'combined' ? chartPred : []}
          height={320}
        />
      </div>

      {/* AI Prediction panel */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px',
        animation: 'fadeUp 0.4s ease 0.2s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Brain size={18} color="var(--accent)" />
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>AI Price Prediction</h2>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>LSTM Neural Network · Next 7 days</span>
        </div>

        {predStatus === 'loading' && (
          <p style={{ color: 'var(--muted)' }}>Fetching predictions…</p>
        )}
        {predStatus === 'training' && (
          <div style={{ padding: '20px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 'var(--radius)', color: 'var(--accent)' }}>
            🧠 Model is training on 2 years of {SYM} data… This takes ~60 seconds. Page will update automatically.
          </div>
        )}
        {predStatus === 'error' && (
          <p style={{ color: 'var(--red)' }}>Could not load predictions. Try retraining.</p>
        )}

        {predStatus === 'done' && prediction && (
          <div>
            {/* Metrics */}
            {prediction.metrics && (
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'MAE',  value: `$${prediction.metrics.mae?.toFixed(2)}` },
                  { label: 'RMSE', value: `$${prediction.metrics.rmse?.toFixed(2)}` },
                  { label: 'MAPE', value: `${prediction.metrics.mape?.toFixed(2)}%` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>{label}:</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Prediction rows */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
              {predRows.map((p, i) => {
                const prev   = i === 0 ? prediction.last_close : predRows[i-1].price
                const change = p.price - prev
                const up     = change >= 0
                return (
                  <div key={p.day} style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '14px 16px',
                    animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 6 }}>Day +{p.day}</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700 }}>${p.price}</div>
                    <div style={{ color: up ? 'var(--green)' : 'var(--red)', fontSize: 12, marginTop: 4 }}>
                      {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({((change/prev)*100).toFixed(1)}%)
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
