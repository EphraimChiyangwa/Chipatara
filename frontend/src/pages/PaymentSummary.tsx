import { useState, useEffect } from 'react'
import { CheckCircle, Lock } from 'lucide-react'
import { initializePayment, verifyPayment, bookAppointment } from '../api'
import { useAuth } from '../context/AuthContext'

interface Props {
  doctor: { _id: string; name: string; profile: any }
  date: string
  reason: string
  onSuccess: () => void
  onBack: () => void
}

declare global {
  interface Window {
    PaystackPop?: {
      setup(opts: {
        key: string
        email: string
        amount: number
        currency: string
        ref: string
        onClose: () => void
        callback: (response: { reference: string }) => void
      }): { openIframe(): void }
    }
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''

export default function PaymentSummary({ doctor, date, reason, onSuccess, onBack }: Props) {
  const { user } = useAuth()
  const fee = doctor.profile?.consultationFee ?? 0
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(false)

  const formattedDate = date ? new Date(date).toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

  // Load Paystack inline script
  useEffect(() => {
    if (fee <= 0) return
    if (document.getElementById('paystack-js')) { setScriptReady(true); return }
    const script = document.createElement('script')
    script.id = 'paystack-js'
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => setScriptReady(true)
    document.head.appendChild(script)
  }, [fee])

  const handlePay = async () => {
    setError(''); setLoading(true)
    try {
      if (fee <= 0) {
        // Free consultation — book directly
        await bookAppointment({ doctorId: doctor._id, date, reason })
        onSuccess()
        return
      }

      const { reference, fee: confirmedFee } = await initializePayment({
        doctorId: doctor._id, date, reason,
      })

      if (!PAYSTACK_PUBLIC_KEY) {
        setError('Paystack public key not configured. Add VITE_PAYSTACK_PUBLIC_KEY to .env')
        setLoading(false)
        return
      }

      if (!window.PaystackPop) {
        setError('Payment script not loaded. Please refresh and try again.')
        setLoading(false)
        return
      }

      const popup = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user?.email ?? '',
        amount: Math.round(confirmedFee * 100),
        currency: 'USD',
        ref: reference,
        onClose: () => { setLoading(false) },
        callback: async (response) => {
          try {
            await verifyPayment({ reference: response.reference, doctorId: doctor._id, date, reason })
            onSuccess()
          } catch (err: any) {
            setError(err.message || 'Payment verification failed.')
            setLoading(false)
          }
        },
      })
      popup.openIframe()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full px-6 pt-6 pb-8">
      {/* Doctor card */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
          style={{ background: '#3B5BDB' }}>
          {doctor.name.charAt(0)}
        </div>
        <div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
            Video Consultation
          </span>
          <p className="font-semibold mt-0.5" style={{ color: '#1B1B2F' }}>Dr. {doctor.name}</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            {doctor.profile ? `${doctor.profile.specialization} · ${doctor.profile.hospital}` : 'General Practitioner'}
          </p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#1B1B2F' }}>{formattedDate}</p>
        </div>
      </div>

      {/* Order summary */}
      <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#9CA3AF' }}>ORDER SUMMARY</p>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
        <div className="px-4 py-4" style={{ background: '#fff' }}>
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>Consultation Fee</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>With Dr. {doctor.name}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{formattedDate}</p>
            </div>
            <p className="font-bold text-sm" style={{ color: '#1B1B2F' }}>
              {fee > 0 ? `$${fee.toFixed(2)}` : 'Free'}
            </p>
          </div>

          <div className="my-3 border-t" style={{ borderColor: '#F0F0F5' }} />

          <div className="flex justify-between items-center mb-1">
            <p className="text-sm" style={{ color: '#6B7280' }}>Reason</p>
            <p className="text-sm max-w-[180px] text-right" style={{ color: '#1B1B2F' }}>{reason}</p>
          </div>
        </div>

        {/* Total bar */}
        <div className="flex justify-between items-center px-4 py-4" style={{ background: '#3B5BDB' }}>
          <p className="font-bold text-white">Total</p>
          <p className="font-bold text-white">{fee > 0 ? `$${fee.toFixed(2)}` : 'Free'}</p>
        </div>
      </div>

      {/* Payment badge */}
      {fee > 0 && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl"
          style={{ background: '#F0FDF4' }}>
          <Lock size={14} style={{ color: '#16A34A' }} />
          <p className="text-xs" style={{ color: '#16A34A' }}>Secured by Paystack — card, bank transfer or mobile money</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
      )}

      <div className="mt-auto pt-6 space-y-3">
        <button
          onClick={handlePay}
          disabled={loading || (fee > 0 && !scriptReady)}
          className="btn-primary flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          {loading
            ? (fee > 0 ? 'Opening Paystack…' : 'Booking…')
            : (fee > 0 ? `Pay $${fee.toFixed(2)} with Paystack` : 'Confirm & Book (Free)')}
        </button>
        <button onClick={onBack} className="btn-outline" disabled={loading}>Back</button>
      </div>
    </div>
  )
}
