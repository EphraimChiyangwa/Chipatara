import { CheckCircle } from 'lucide-react'

interface Props {
  doctor: { name: string; profile: any }
  date: string
  reason: string
  onConfirm: () => void
  onBack: () => void
  loading: boolean
  error: string
}

export default function PaymentSummary({ doctor, date, reason, onConfirm, onBack, loading, error }: Props) {
  const fee = doctor.profile?.consultationFee ?? 0
  const formattedDate = date ? new Date(date).toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

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
              <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>Primary Care Visit Fee</p>
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
            <p className="text-sm" style={{ color: '#1B1B2F' }}>{reason}</p>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm" style={{ color: '#6B7280' }}>Discount</p>
            <p className="text-sm" style={{ color: '#1B1B2F' }}>$0.00</p>
          </div>
        </div>

        {/* Total bar */}
        <div className="flex justify-between items-center px-4 py-4" style={{ background: '#3B5BDB' }}>
          <p className="font-bold text-white">Today's Total</p>
          <p className="font-bold text-white">{fee > 0 ? `$${fee.toFixed(2)}` : 'Free'}</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>{error}</div>
      )}

      <div className="mt-auto pt-6 space-y-3">
        <button onClick={onConfirm} disabled={loading} className="btn-primary flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          {loading ? 'Booking…' : 'Confirm & Book'}
        </button>
        <button onClick={onBack} className="btn-outline">Back</button>
      </div>
    </div>
  )
}
