import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '../api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="app-shell flex flex-col items-center justify-center px-6">
        <p className="text-sm" style={{ color: '#DC2626' }}>Invalid or missing reset link.</p>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Back to Sign In</button>
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col px-6 pt-16 pb-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B1B2F' }}>Reset Password</h1>
      <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Choose a new password for your account.</p>

      {done ? (
        <div className="flex flex-col items-center text-center mt-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#D1FAE5' }}>
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: '#1B1B2F' }}>Password Reset!</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>You can now sign in with your new password.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Sign In</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
          )}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
            <input
              type={showPw ? 'text' : 'password'} required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              className="input-field pr-12"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showPw ? <EyeOff size={18} style={{ color: '#aab0c0' }} /> : <Eye size={18} style={{ color: '#aab0c0' }} />}
            </button>
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
            <input
              type={showPw ? 'text' : 'password'} required value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  )
}
