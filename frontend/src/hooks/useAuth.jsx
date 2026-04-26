import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ss_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('ss_token'))
      .finally(() => setLoading(false))
  }, [])

  const saveLogin = (token, userData) => {
    localStorage.setItem('ss_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('ss_token')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, saveLogin, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
