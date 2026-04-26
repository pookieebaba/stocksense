import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)', padding: '10px 14px',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>
        ${Number(val).toFixed(2)}
      </div>
    </div>
  )
}

export default function PriceChart({ data = [], predictionData = [], height = 300 }) {
  const allData = [
    ...data.map(d => ({ ...d, type: 'actual' })),
    ...predictionData.map(d => ({ ...d, type: 'prediction' })),
  ]

  const prices  = allData.map(d => d.close || d.price).filter(Boolean)
  const minP    = Math.min(...prices) * 0.995
  const maxP    = Math.max(...prices) * 1.005
  const isUp    = prices.length > 1 && prices[prices.length - 1] >= prices[0]
  const color   = isUp ? 'var(--green)' : 'var(--red)'
  const gradId  = isUp ? 'gradGreen' : 'gradRed'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={allData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00e676" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ff4d6d" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => v ? String(v).slice(0, 10) : ''}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minP, maxP]}
          tick={{ fill: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false} axisLine={false}
          tickFormatter={v => `$${v.toFixed(0)}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Prediction separator line */}
        {predictionData.length > 0 && (
          <ReferenceLine
            x={predictionData[0].date}
            stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: 'Predicted', fill: 'var(--accent)', fontSize: 11, position: 'top' }}
          />
        )}

        <Area
          type="monotone"
          dataKey={d => d.close || d.price}
          stroke={color} strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
