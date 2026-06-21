import { useEffect, useState } from 'react'
import { Users, Calendar, Trash2, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminGetUsers, adminDeleteUser, adminGetAppointments, adminUpdateAppointmentStatus } from '../api'

type User = { _id: string; name: string; email: string; role: string }
type Appointment = { _id: string; patient: any; doctor: any; date: string; reason: string; status: string }
type Tab = 'users' | 'appointments'

export default function AdminDashboard() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminGetUsers().then(setUsers)
    adminGetAppointments().then(setAppointments)
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return
    try {
      await adminDeleteUser(id)
      setUsers(prev => prev.filter(u => u._id !== id))
      flash('User deleted.')
    } catch (err: any) { flash(err.message) }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await adminUpdateAppointmentStatus(id, status)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a))
      flash(`Status updated to ${status}.`)
    } catch (err: any) { flash(err.message) }
  }

  const roleColor = (r: string) => ({
    patient: { bg: '#EBF0FF', text: '#3B5BDB' },
    doctor: { bg: '#F3E8FF', text: '#7C3AED' },
    admin: { bg: '#FEF3C7', text: '#92400E' },
  }[r] ?? { bg: '#F3F4F6', text: '#374151' })

  const statusColor = (s: string) => ({
    pending: { bg: '#FEF3C7', text: '#92400E' },
    confirmed: { bg: '#D1FAE5', text: '#065F46' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    completed: { bg: '#DBEAFE', text: '#1E40AF' },
  }[s] ?? { bg: '#F3F4F6', text: '#374151' })

  const doctors = users.filter(u => u.role === 'doctor').length
  const patients = users.filter(u => u.role === 'patient').length

  return (
    <div className="app-shell" style={{ background: '#F8F9FE' }}>
      {/* Header */}
      <div className="px-6 pt-12 pb-6" style={{ background: '#EBF0FF' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm" style={{ color: '#6B7280' }}>Admin Panel</p>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Chipatara</h2>
          </div>
          <button onClick={logout} className="text-xs font-medium px-3 py-1.5 rounded-xl"
            style={{ background: '#FEE2E2', color: '#DC2626' }}>Sign Out</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Users', value: users.length, icon: Users, color: '#3B5BDB' },
            { label: 'Doctors', value: doctors, icon: Users, color: '#7C3AED' },
            { label: 'Appointments', value: appointments.length, icon: Calendar, color: '#10B981' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div className="mx-6 mt-3 p-3 rounded-xl text-sm text-center" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>{msg}</div>
      )}

      {/* Tabs */}
      <div className="flex px-6 mt-4 gap-2">
        {(['users', 'appointments'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? '#3B5BDB' : '#fff', color: tab === t ? '#fff' : '#6B7280' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <div className="px-6 mt-4 pb-8 space-y-3">
          {users.map(u => {
            const rc = roleColor(u.role)
            return (
              <div key={u._id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ background: rc.text }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: '#6B7280' }}>{u.email}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{ background: rc.bg, color: rc.text }}>{u.role}</span>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => handleDeleteUser(u._id)} className="flex-shrink-0 p-2 rounded-xl"
                    style={{ background: '#FEE2E2' }}>
                    <Trash2 size={15} style={{ color: '#DC2626' }} />
                  </button>
                )}
              </div>
            )
          })}
          {users.length === 0 && <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No users found.</p>}
        </div>
      )}

      {/* Appointments */}
      {tab === 'appointments' && (
        <div className="px-6 mt-4 pb-8 space-y-3">
          {appointments.map(a => {
            const sc = statusColor(a.status)
            return (
              <div key={a._id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                </div>
                <p className="text-xs mb-0.5" style={{ color: '#6B7280' }}>
                  Patient: <span style={{ color: '#1B1B2F' }}>{a.patient?.name ?? '—'}</span>
                </p>
                <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                  Doctor: <span style={{ color: '#1B1B2F' }}>{a.doctor?.name ?? '—'}</span>
                </p>
                <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{new Date(a.date).toLocaleString()}</p>
                <div className="flex gap-2 flex-wrap">
                  {(['pending', 'confirmed', 'cancelled', 'completed'] as string[])
                    .filter(s => s !== a.status)
                    .map(s => (
                      <button key={s} onClick={() => handleStatusUpdate(a._id, s)}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl capitalize"
                        style={{ background: statusColor(s).bg, color: statusColor(s).text }}>
                        → {s}
                      </button>
                    ))}
                </div>
              </div>
            )
          })}
          {appointments.length === 0 && <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No appointments.</p>}
        </div>
      )}
    </div>
  )
}
