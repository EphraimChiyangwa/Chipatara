import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Mail } from 'lucide-react'
import { forgotPassword } from '../api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col px-6 pt-12 pb-8">
      <button onClick={() => navigate('/login')} className="flex items-center gap-1 mb-8 w-fit" style={{ color: '#3B5BDB' }}>
        <ChevronLeft size={20} />
      </button>

      <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B1B2F' }}>Forgot Password?</h1>
      <p className="text-sm mb-8" style={{ color: '#6B7280' }}>Enter your email and we'll send you a reset link.</p>

      {sent ? (
        <div className="flex flex-col items-center text-center mt-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#D1FAE5' }}>
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: '#1B1B2F' }}>Check your email</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            If an account with <strong>{email}</strong> exists, a reset link has been sent.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary">Back to Sign In</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
          )}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </div>
  )
}
