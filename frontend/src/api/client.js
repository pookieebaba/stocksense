import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ss_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auth ──────────────────────────────────────────────────────────────────
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password })

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const getMe = () => api.get('/auth/me')

// ── Stocks ────────────────────────────────────────────────────────────────
export const searchStocks  = q        => api.get(`/stocks/search?q=${q}`)
export const getQuote      = symbol   => api.get(`/stocks/${symbol}/quote`)
export const getHistory    = (symbol, period = '6mo', interval = '1d') =>
  api.get(`/stocks/${symbol}/history?period=${period}&interval=${interval}`)

// ── Watchlist ─────────────────────────────────────────────────────────────
export const getWatchlist  = ()       => api.get('/watchlist/')
export const addToWatch    = symbol   => api.post('/watchlist/', { symbol })
export const removeWatch   = symbol   => api.delete(`/watchlist/${symbol}`)

// ── Alerts ────────────────────────────────────────────────────────────────
export const getAlerts     = ()                           => api.get('/watchlist/alerts')
export const createAlert   = (symbol, target_price, direction) =>
  api.post('/watchlist/alerts', { symbol, target_price, direction })

// ── ML ────────────────────────────────────────────────────────────────────
export const getPrediction = (symbol, days = 7) =>
  api.get(`/ml/${symbol}/predict?days=${days}`)
export const trainModel    = symbol => api.post(`/ml/${symbol}/train`)
export const modelStatus   = symbol => api.get(`/ml/${symbol}/status`)

export default api
