import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="app-shell flex flex-col items-center justify-between py-16 px-8" style={{ background: '#fff' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mt-8">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="50" fill="#EBF0FF" />
          {/* Hand */}
          <path d="M20 62 C20 62 28 72 50 72 C72 72 80 62 80 62 L74 52 C74 52 66 58 50 58 C34 58 26 52 26 52 Z" fill="#3B5BDB" />
          {/* Heart */}
          <path d="M50 46 C50 46 38 36 38 28 C38 23 42 20 46 20 C48 20 50 22 50 22 C50 22 52 20 54 20 C58 20 62 23 62 28 C62 36 50 46 50 46Z" fill="#E83F6F" />
          {/* Cross */}
          <rect x="47" y="24" width="6" height="14" rx="2" fill="white" />
          <rect x="43" y="28" width="14" height="6" rx="2" fill="white" />
        </svg>
        <h1 className="text-3xl font-extrabold tracking-widest mt-4" style={{ color: '#1B2B6B' }}>CHIPATARA</h1>
        <p className="text-xs font-semibold tracking-widest mt-1" style={{ color: '#E83F6F' }}>HEALTHCARE WITHOUT DISTANCE</p>
      </div>

      {/* Tagline */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1B1B2F' }}>Let's get started!</h2>
        <p style={{ color: '#6B7280' }}>Premium monitoring and Guidance</p>
      </div>

      {/* Buttons */}
      <div className="w-full space-y-4">
        <button className="btn-primary" onClick={() => navigate('/login')}>Login</button>
        <button className="btn-outline" onClick={() => navigate('/register')}>Sign Up</button>
      </div>
    </div>
  )
}
