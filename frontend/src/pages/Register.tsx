import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { register as apiRegister, login as apiLogin } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' })
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { setError('Please agree to the Terms of Service.'); return }
    setError('')
    setLoading(true)
    try {
      await apiRegister(form)
      const data = await apiLogin({ email: form.email, password: form.password })
      await login(data.token)
      if (form.role === 'patient') navigate('/patient')
      else if (form.role === 'doctor') navigate('/doctor')
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

      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1B1B2F' }}>Sign Up</h1>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        {/* Name */}
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <input
            type="text" required value={form.name} onChange={set('name')}
            placeholder="Enter your name"
            className="input-field"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <input
            type="email" required value={form.email} onChange={set('email')}
            placeholder="Enter your email"
            className="input-field"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <input
            type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
            placeholder="Enter your password"
            className="input-field pr-12"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2">
            {showPw ? <EyeOff size={18} style={{ color: '#aab0c0' }} /> : <Eye size={18} style={{ color: '#aab0c0' }} />}
          </button>
        </div>

        {/* Role */}
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
          <select value={form.role} onChange={set('role')} className="input-field appearance-none">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm" style={{ color: '#6B7280' }}>
            I agree to the healthcare{' '}
            <span className="font-medium" style={{ color: '#3B5BDB' }}>Terms of Service</span>
            {' '}and{' '}
            <span className="font-medium" style={{ color: '#3B5BDB' }}>Privacy Policy</span>
          </span>
        </label>

        <div className="flex-1" />

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>

        <p className="text-center text-sm mt-1" style={{ color: '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color: '#3B5BDB' }}>Sign In</Link>
        </p>
      </form>
    </div>
  )
}
