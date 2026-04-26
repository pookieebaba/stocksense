import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import Watchlist from './pages/Watchlist'
import Login from './pages/Login'
import './index.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/stock/:symbol" element={<Stock />} />
              <Route path="/watchlist"     element={<Watchlist />} />
              <Route path="/login"         element={<Login />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
