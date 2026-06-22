import { useEffect, useState } from 'react'
import { Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminGetUsers, adminDeleteUser, adminGetAppointments, adminUpdateAppointmentStatus, adminGetDoctors, adminVerifyDoctor, adminRejectDoctor } from '../api'

type User = { _id: string; name: string; email: string; role: string }
type Appointment = { _id: string; patient: any; doctor: any; date: string; reason: string; status: string }
type DoctorProfile = { _id: string; user: { _id: string; name: string; email: string }; specialization: string; hospital: string; consultationFee: number; bio: string; verified: boolean; createdAt: string }
type Tab = 'users' | 'appointments' | 'doctors' | 'analytics'

export default function AdminDashboard() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctorProfiles, setDoctorProfiles] = useState<DoctorProfile[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    adminGetUsers().then(setUsers)
    adminGetAppointments().then(setAppointments)
    adminGetDoctors().then(setDoctorProfiles)
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const handleVerify = async (id: string) => {
    try {
      await adminVerifyDoctor(id)
      setDoctorProfiles(prev => prev.map(d => d._id === id ? { ...d, verified: true } : d))
      flash('Doctor verified.')
    } catch (err: any) { flash(err.message) }
  }

  const handleReject = async (id: string) => {
    try {
      await adminRejectDoctor(id)
      setDoctorProfiles(prev => prev.map(d => d._id === id ? { ...d, verified: false } : d))
      flash('Doctor rejected.')
    } catch (err: any) { flash(err.message) }
  }

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

  const pendingDoctors = doctorProfiles.filter(d => !d.verified).length

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
            { label: 'Users', value: users.length, color: '#3B5BDB' },
            { label: 'Pending', value: pendingDoctors, color: '#D97706' },
            { label: 'Appointments', value: appointments.length, color: '#10B981' },
          ].map(({ label, value, color }) => (
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
        {(['users', 'doctors', 'appointments', 'analytics'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? '#3B5BDB' : '#fff', color: tab === t ? '#fff' : '#6B7280' }}>
            {t}
            {t === 'doctors' && pendingDoctors > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white"
                style={{ background: '#EF4444', fontSize: 10 }}>{pendingDoctors}</span>
            )}
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

      {/* Doctors */}
      {tab === 'doctors' && (
        <div className="px-6 mt-4 pb-8">
          {doctorProfiles.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No doctor profiles yet.</p>
          )}

          {/* Pending section */}
          {doctorProfiles.filter(d => !d.verified).length > 0 && (
            <>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#D97706' }}>PENDING VERIFICATION</p>
              <div className="space-y-3 mb-6">
                {doctorProfiles.filter(d => !d.verified).map(d => (
                  <div key={d._id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                        style={{ background: '#7C3AED' }}>
                        {d.user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>Dr. {d.user?.name}</p>
                        <p className="text-xs truncate" style={{ color: '#6B7280' }}>{d.user?.email}</p>
                      </div>
                    </div>
                    <div className="text-xs space-y-0.5 mb-3" style={{ color: '#6B7280' }}>
                      <p><span className="font-medium" style={{ color: '#1B1B2F' }}>Specialization:</span> {d.specialization}</p>
                      <p><span className="font-medium" style={{ color: '#1B1B2F' }}>Hospital:</span> {d.hospital}</p>
                      <p><span className="font-medium" style={{ color: '#1B1B2F' }}>Fee:</span> ${d.consultationFee}</p>
                      {d.bio && <p><span className="font-medium" style={{ color: '#1B1B2F' }}>Bio:</span> {d.bio}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(d._id)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button onClick={() => handleReject(d._id)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Verified section */}
          {doctorProfiles.filter(d => d.verified).length > 0 && (
            <>
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#10B981' }}>VERIFIED</p>
              <div className="space-y-3">
                {doctorProfiles.filter(d => d.verified).map(d => (
                  <div key={d._id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{ background: '#10B981' }}>
                      {d.user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>Dr. {d.user?.name}</p>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>{d.specialization} · {d.hospital}</p>
                    </div>
                    <button onClick={() => handleReject(d._id)}
                      className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-xl"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}>
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (() => {
        const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
        appointments.forEach(a => { if (a.status in statusCounts) (statusCounts as any)[a.status]++ })

        const doctorAppts: Record<string, { name: string; count: number; fee: number }> = {}
        appointments.forEach(a => {
          const did = a.doctor?._id ?? 'unknown'
          if (!doctorAppts[did]) {
            const dp = doctorProfiles.find(d => d.user?._id === did)
            doctorAppts[did] = { name: a.doctor?.name ?? 'Unknown', count: 0, fee: dp?.consultationFee ?? 0 }
          }
          doctorAppts[did].count++
        })
        const topDoctors = Object.values(doctorAppts).sort((a, b) => b.count - a.count).slice(0, 5)

        const totalRevenue = appointments
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => {
            const dp = doctorProfiles.find(d => d.user?._id === a.doctor?._id)
            return sum + (dp?.consultationFee ?? 0)
          }, 0)

        const roleBreakdown = { patient: 0, doctor: 0, admin: 0 }
        users.forEach(u => { if (u.role in roleBreakdown) (roleBreakdown as any)[u.role]++ })

        const maxAppts = Math.max(1, ...topDoctors.map(d => d.count))
        const statusEntries = Object.entries(statusCounts) as [string, number][]
        const maxStatus = Math.max(1, ...statusEntries.map(([, v]) => v))

        const barColors: Record<string, string> = {
          pending: '#F59E0B', confirmed: '#10B981', completed: '#3B5BDB', cancelled: '#EF4444'
        }

        return (
          <div className="px-6 mt-4 pb-8 space-y-5">
            {/* Revenue */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#6B7280' }}>REVENUE (COMPLETED)</p>
              <p className="text-3xl font-bold" style={{ color: '#3B5BDB' }}>${totalRevenue.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>From {statusCounts.completed} completed appointments</p>
            </div>

            {/* Appointments by status */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold tracking-widest mb-4" style={{ color: '#6B7280' }}>APPOINTMENTS BY STATUS</p>
              <div className="space-y-3">
                {statusEntries.map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize font-medium" style={{ color: '#374151' }}>{status}</span>
                      <span style={{ color: '#6B7280' }}>{count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: '#F3F4F6' }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxStatus) * 100}%`, background: barColors[status] ?? '#9CA3AF' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top doctors */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold tracking-widest mb-4" style={{ color: '#6B7280' }}>TOP DOCTORS BY APPOINTMENTS</p>
              {topDoctors.length === 0
                ? <p className="text-xs text-center py-4" style={{ color: '#9CA3AF' }}>No data yet.</p>
                : <div className="space-y-3">
                    {topDoctors.map((d, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate max-w-[180px]" style={{ color: '#374151' }}>Dr. {d.name}</span>
                          <span style={{ color: '#6B7280' }}>{d.count} appts</span>
                        </div>
                        <div className="w-full h-2 rounded-full" style={{ background: '#F3F4F6' }}>
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${(d.count / maxAppts) * 100}%`, background: '#7C3AED' }} />
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* User roles */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold tracking-widest mb-4" style={{ color: '#6B7280' }}>USER BREAKDOWN</p>
              <div className="flex gap-3">
                {(Object.entries(roleBreakdown) as [string, number][]).map(([role, count]) => {
                  const rc = roleColor(role)
                  return (
                    <div key={role} className="flex-1 rounded-2xl p-3 text-center" style={{ background: rc.bg }}>
                      <p className="text-xl font-bold" style={{ color: rc.text }}>{count}</p>
                      <p className="text-xs capitalize mt-0.5" style={{ color: rc.text }}>{role}s</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

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
