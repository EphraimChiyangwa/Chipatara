import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { login as apiLogin } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiLogin({ email, password })
      await login(data.token)
      const role = JSON.parse(atob(data.token.split('.')[1])).role
      if (role === 'patient') navigate('/patient')
      else if (role === 'doctor') navigate('/doctor')
      else navigate('/admin')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col px-6 pt-12 pb-8">
      {/* Back */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1 mb-8 w-fit" style={{ color: '#3B5BDB' }}>
        <ChevronLeft size={20} />
      </button>

      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1B1B2F' }}>Sign In</h1>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        {/* Email */}
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="input-field"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <input
            type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="input-field pr-12"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
            {showPw ? <EyeOff size={18} style={{ color: '#aab0c0' }} /> : <Eye size={18} style={{ color: '#aab0c0' }} />}
          </button>
        </div>

        {/* Forgot */}
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium" style={{ color: '#3B5BDB' }}>Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm mt-1" style={{ color: '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold" style={{ color: '#3B5BDB' }}>Sign up</Link>
        </p>

        {/* OR divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
        </div>

        {/* Social buttons */}
        <button type="button" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium" style={{ borderColor: '#E5E7EB', color: '#1B1B2F' }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>

        <button type="button" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium" style={{ borderColor: '#E5E7EB', color: '#1B1B2F' }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#1877F2' }}>
            <span className="text-white text-xs font-bold">f</span>
          </div>
          Sign in with Facebook
        </button>
      </form>
    </div>
  )
}
