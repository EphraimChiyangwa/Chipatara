import { useEffect, useState, useMemo } from 'react'
import {
  Users, Stethoscope, Calendar, BarChart2, Bell, LogOut,
  CheckCircle, XCircle, Trash2, ShieldOff, Shield, Search,
  TrendingUp, UserCheck, Activity, DollarSign, RefreshCw
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  adminGetUsers, adminDeleteUser, adminGetAppointments, adminUpdateAppointmentStatus,
  adminGetDoctors, adminVerifyDoctor, adminRejectDoctor, adminGetStats,
  adminSuspendUser, adminBroadcast
} from '../api'

// ── Types ─────────────────────────────────────────────────────────────────────
type User = { _id: string; name: string; email: string; role: string; suspended?: boolean }
type Appointment = { _id: string; patient: any; doctor: any; date: string; reason: string; status: string }
type DoctorProfile = { _id: string; user: { _id: string; name: string; email: string }; specialization: string; hospital: string; consultationFee: number; bio?: string; verified: boolean; createdAt: string }
type Stats = { totalUsers: number; totalDoctors: number; totalAppointments: number; pendingDoctors: number; newUsersThisWeek: number; apptThisMonth: number; totalRevenue: number }
type Tab = 'overview' | 'users' | 'doctors' | 'appointments' | 'analytics' | 'broadcast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const roleStyle = (r: string) => ({
  patient: { bg: '#EBF0FF', text: '#3B5BDB' },
  doctor:  { bg: '#F3E8FF', text: '#7C3AED' },
  admin:   { bg: '#FEF3C7', text: '#92400E' },
}[r] ?? { bg: '#F3F4F6', text: '#374151' })

const statusStyle = (s: string) => ({
  pending:   { bg: '#FEF9C3', text: '#854D0E' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  completed: { bg: '#DBEAFE', text: '#1E40AF' },
}[s] ?? { bg: '#F3F4F6', text: '#374151' })

const avatar = (name: string, color: string) => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
    style={{ background: color }}>{name?.charAt(0)?.toUpperCase() ?? '?'}</div>
)

// ── Main component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [users, setUsers]               = useState<User[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors]           = useState<DoctorProfile[]>([])
  const [stats, setStats]               = useState<Stats | null>(null)
  const [toast, setToast]               = useState('')
  const [loading, setLoading]           = useState(true)
  const [userSearch, setUserSearch]     = useState('')
  const [apptSearch, setApptSearch]     = useState('')
  const [apptFilter, setApptFilter]     = useState('all')

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [u, a, d, s] = await Promise.all([
        adminGetUsers(), adminGetAppointments(), adminGetDoctors(), adminGetStats()
      ])
      setUsers(u); setAppointments(a); setDoctors(d); setStats(s)
    } catch { flash('Failed to load data — check your connection.') }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    ), [users, userSearch])

  const filteredAppts = useMemo(() =>
    appointments.filter(a => {
      const matchStatus = apptFilter === 'all' || a.status === apptFilter
      const q = apptSearch.toLowerCase()
      const matchSearch = !q || (a.patient?.name ?? '').toLowerCase().includes(q) ||
        (a.doctor?.name ?? '').toLowerCase().includes(q) || a.reason.toLowerCase().includes(q)
      return matchStatus && matchSearch
    }), [appointments, apptSearch, apptFilter])

  const pendingDoctors = doctors.filter(d => !d.verified).length

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleVerify = async (id: string) => {
    try { await adminVerifyDoctor(id); setDoctors(p => p.map(d => d._id === id ? { ...d, verified: true } : d)); flash('Doctor approved.') }
    catch (e: any) { flash(e.message) }
  }
  const handleReject = async (id: string) => {
    try { await adminRejectDoctor(id); setDoctors(p => p.map(d => d._id === id ? { ...d, verified: false } : d)); flash('Doctor rejected.') }
    catch (e: any) { flash(e.message) }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this user and all their data?')) return
    try { await adminDeleteUser(id); setUsers(p => p.filter(u => u._id !== id)); flash('User deleted.') }
    catch (e: any) { flash(e.message) }
  }
  const handleSuspend = async (id: string, suspended: boolean) => {
    try {
      const res = await adminSuspendUser(id)
      setUsers(p => p.map(u => u._id === id ? { ...u, suspended: res.suspended } : u))
      flash(res.suspended ? 'User suspended.' : 'User unsuspended.')
    } catch (e: any) { flash(e.message) }
  }
  const handleApptStatus = async (id: string, status: string) => {
    try { await adminUpdateAppointmentStatus(id, status); setAppointments(p => p.map(a => a._id === id ? { ...a, status } : a)); flash(`Status → ${status}`) }
    catch (e: any) { flash(e.message) }
  }

  // ── Sidebar nav items ─────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview',      label: 'Overview',      icon: <Activity size={16} /> },
    { id: 'users',        label: 'Users',         icon: <Users size={16} />,        badge: users.length },
    { id: 'doctors',      label: 'Doctors',       icon: <Stethoscope size={16} />,  badge: pendingDoctors || undefined },
    { id: 'appointments', label: 'Appointments',  icon: <Calendar size={16} /> },
    { id: 'analytics',    label: 'Analytics',     icon: <BarChart2 size={16} /> },
    { id: 'broadcast',    label: 'Broadcast',     icon: <Bell size={16} /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3B5BDB,#5B7AF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', lineHeight: 1 }}>Chipatara</p>
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: 600 }}>ADMIN PANEL</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                background: tab === item.id ? '#EBF0FF' : 'transparent',
                color: tab === item.id ? '#3B5BDB' : '#64748B',
                fontWeight: tab === item.id ? 700 : 500, fontSize: 13,
                position: 'relative', transition: 'all 0.15s',
              }}>
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  background: item.id === 'doctors' ? '#EF4444' : '#EBF0FF',
                  color: item.id === 'doctors' ? '#fff' : '#3B5BDB',
                }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: 13 }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {navItems.find(n => n.id === tab)?.label}
            </h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>Chipatara Telemedicine Platform</p>
          </div>
          <button onClick={loadAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        {/* Toast */}
        {toast && (
          <div style={{ margin: '12px 32px 0', padding: '10px 16px', borderRadius: 10, background: '#EBF0FF', color: '#3B5BDB', fontSize: 13, fontWeight: 600 }}>
            {toast}
          </div>
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #3B5BDB', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab stats={stats} users={users} appointments={appointments} />}
              {tab === 'users' && <UsersTab users={filteredUsers} search={userSearch} onSearch={setUserSearch} onDelete={handleDelete} onSuspend={handleSuspend} />}
              {tab === 'doctors' && <DoctorsTab doctors={doctors} onVerify={handleVerify} onReject={handleReject} />}
              {tab === 'appointments' && <AppointmentsTab appointments={filteredAppts} search={apptSearch} filter={apptFilter} onSearch={setApptSearch} onFilter={setApptFilter} onStatus={handleApptStatus} />}
              {tab === 'analytics' && <AnalyticsTab appointments={appointments} users={users} doctors={doctors} stats={stats} />}
              {tab === 'broadcast' && <BroadcastTab onSend={adminBroadcast} flash={flash} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ stats, users, appointments }: { stats: Stats | null; users: User[]; appointments: Appointment[] }) {
  const cards = [
    { label: 'Total Users',      value: stats?.totalUsers ?? users.length,             icon: <Users size={20} />,        color: '#3B5BDB', bg: '#EBF0FF', sub: `+${stats?.newUsersThisWeek ?? 0} this week` },
    { label: 'Total Revenue',    value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: <DollarSign size={20} />,  color: '#059669', bg: '#DCFCE7', sub: 'from completed consults' },
    { label: 'Appointments',     value: stats?.totalAppointments ?? appointments.length,  icon: <Calendar size={20} />,    color: '#D97706', bg: '#FEF9C3', sub: `${stats?.apptThisMonth ?? 0} this month` },
    { label: 'Pending Doctors',  value: stats?.pendingDoctors ?? 0,                       icon: <UserCheck size={20} />,   color: '#DC2626', bg: '#FEE2E2', sub: 'awaiting verification' },
  ]
  const recentUsers = users.slice(0, 5)
  const recentAppts = appointments.slice(0, 5)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', margin: 0 }}>{c.label}</p>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>{c.icon}</div>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{c.value}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Section title="Recent Users" icon={<Users size={14} />}>
          {recentUsers.map(u => {
            const rs = roleStyle(u.role)
            return (
              <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                {avatar(u.name, rs.text)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: rs.bg, color: rs.text }}>{u.role}</span>
              </div>
            )
          })}
        </Section>

        <Section title="Recent Appointments" icon={<Calendar size={14} />}>
          {recentAppts.map(a => {
            const ss = statusStyle(a.status)
            return (
              <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{a.patient?.name} → Dr. {a.doctor?.name}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ss.bg, color: ss.text }}>{a.status}</span>
              </div>
            )
          })}
        </Section>
      </div>
    </div>
  )
}

// ── Users Tab ──────────────────────────────────────────────────────────────────
function UsersTab({ users, search, onSearch, onDelete, onSuspend }: { users: User[]; search: string; onSearch: (s: string) => void; onDelete: (id: string) => void; onSuspend: (id: string, s: boolean) => void }) {
  return (
    <div>
      <SearchBar value={search} onChange={onSearch} placeholder="Search by name or email…" />
      <Table headers={['User', 'Email', 'Role', 'Status', 'Actions']}>
        {users.map(u => {
          const rs = roleStyle(u.role)
          return (
            <tr key={u._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{avatar(u.name, rs.text)}<span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{u.name}</span></div></td>
              <td style={td}><span style={{ fontSize: 13, color: '#64748B' }}>{u.email}</span></td>
              <td style={td}><Badge bg={rs.bg} color={rs.text}>{u.role}</Badge></td>
              <td style={td}><Badge bg={u.suspended ? '#FEE2E2' : '#DCFCE7'} color={u.suspended ? '#991B1B' : '#166534'}>{u.suspended ? 'Suspended' : 'Active'}</Badge></td>
              <td style={td}>
                {u.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconBtn color={u.suspended ? '#059669' : '#D97706'} bg={u.suspended ? '#DCFCE7' : '#FEF9C3'} title={u.suspended ? 'Unsuspend' : 'Suspend'} onClick={() => onSuspend(u._id, !!u.suspended)}>
                      {u.suspended ? <Shield size={13} /> : <ShieldOff size={13} />}
                    </IconBtn>
                    <IconBtn color="#DC2626" bg="#FEE2E2" title="Delete user" onClick={() => onDelete(u._id)}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                )}
              </td>
            </tr>
          )
        })}
      </Table>
      {users.length === 0 && <Empty text="No users match your search." />}
    </div>
  )
}

// ── Doctors Tab ────────────────────────────────────────────────────────────────
function DoctorsTab({ doctors, onVerify, onReject }: { doctors: DoctorProfile[]; onVerify: (id: string) => void; onReject: (id: string) => void }) {
  const pending  = doctors.filter(d => !d.verified)
  const verified = doctors.filter(d => d.verified)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {pending.length > 0 && (
        <div>
          <SectionLabel color="#DC2626">Pending Verification ({pending.length})</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14 }}>
            {pending.map(d => (
              <div key={d._id} style={{ background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #FCA5A5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {avatar(d.user?.name ?? 'D', '#7C3AED')}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', margin: 0 }}>Dr. {d.user?.name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{d.user?.email}</p>
                  </div>
                </div>
                <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 14 }}>
                  {[['Specialization', d.specialization], ['Hospital', d.hospital], ['Fee', `$${d.consultationFee}`], ['Experience', `${d.yearsOfExperience ?? 0} yrs`]].map(([k, v]) => (
                    <div key={k}><dt style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{k}</dt><dd style={{ fontSize: 12, color: '#0F172A', fontWeight: 600, margin: 0 }}>{v}</dd></div>
                  ))}
                </dl>
                {d.bio && <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{d.bio}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn color="#059669" bg="#DCFCE7" onClick={() => onVerify(d._id)}><CheckCircle size={13} /> Approve</Btn>
                  <Btn color="#DC2626" bg="#FEE2E2" onClick={() => onReject(d._id)}><XCircle size={13} /> Reject</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel color="#059669">Verified Doctors ({verified.length})</SectionLabel>
        <Table headers={['Doctor', 'Specialization', 'Hospital', 'Fee', 'Actions']}>
          {verified.map(d => (
            <tr key={d._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{avatar(d.user?.name ?? 'D', '#059669')}<span style={{ fontWeight: 600, fontSize: 13 }}>Dr. {d.user?.name}</span></div></td>
              <td style={td}><span style={{ fontSize: 13, color: '#64748B' }}>{d.specialization}</span></td>
              <td style={td}><span style={{ fontSize: 13, color: '#64748B' }}>{d.hospital}</span></td>
              <td style={td}><span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>${d.consultationFee}</span></td>
              <td style={td}><Btn color="#DC2626" bg="#FEE2E2" onClick={() => onReject(d._id)}><XCircle size={13} /> Revoke</Btn></td>
            </tr>
          ))}
        </Table>
        {verified.length === 0 && <Empty text="No verified doctors yet." />}
      </div>
    </div>
  )
}

// ── Appointments Tab ───────────────────────────────────────────────────────────
function AppointmentsTab({ appointments, search, filter, onSearch, onFilter, onStatus }: {
  appointments: Appointment[]; search: string; filter: string
  onSearch: (s: string) => void; onFilter: (f: string) => void; onStatus: (id: string, s: string) => void
}) {
  const statuses = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <SearchBar value={search} onChange={onSearch} placeholder="Search patient, doctor, reason…" />
        <select value={filter} onChange={e => onFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, color: '#374151', background: '#fff', fontFamily: 'inherit' }}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      <Table headers={['Patient', 'Doctor', 'Date', 'Reason', 'Status', 'Actions']}>
        {appointments.map(a => {
          const ss = statusStyle(a.status)
          return (
            <tr key={a._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={td}><span style={{ fontSize: 13, fontWeight: 600 }}>{a.patient?.name ?? '—'}</span></td>
              <td style={td}><span style={{ fontSize: 13, color: '#64748B' }}>Dr. {a.doctor?.name ?? '—'}</span></td>
              <td style={td}><span style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(a.date).toLocaleDateString()}</span></td>
              <td style={td}><span style={{ fontSize: 13, color: '#64748B', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</span></td>
              <td style={td}><Badge bg={ss.bg} color={ss.text}>{a.status}</Badge></td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(['pending','confirmed','completed','cancelled'] as string[]).filter(s => s !== a.status).map(s => {
                    const st = statusStyle(s)
                    return <Btn key={s} color={st.text} bg={st.bg} onClick={() => onStatus(a._id, s)}>→ {s}</Btn>
                  })}
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
      {appointments.length === 0 && <Empty text="No appointments match your filters." />}
    </div>
  )
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
function AnalyticsTab({ appointments, users, doctors, stats }: { appointments: Appointment[]; users: User[]; doctors: DoctorProfile[]; stats: Stats | null }) {
  const statusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  appointments.forEach(a => { if (a.status in statusCounts) (statusCounts as any)[a.status]++ })

  const roleBreakdown = { patient: 0, doctor: 0, admin: 0 }
  users.forEach(u => { if (u.role in roleBreakdown) (roleBreakdown as any)[u.role]++ })

  const doctorApptMap: Record<string, { name: string; count: number }> = {}
  appointments.forEach(a => {
    const id = a.doctor?._id ?? 'x'
    if (!doctorApptMap[id]) doctorApptMap[id] = { name: a.doctor?.name ?? 'Unknown', count: 0 }
    doctorApptMap[id].count++
  })
  const topDoctors = Object.values(doctorApptMap).sort((a, b) => b.count - a.count).slice(0, 6)
  const maxAppts = Math.max(1, ...topDoctors.map(d => d.count))

  const statusColors: Record<string, string> = { pending: '#F59E0B', confirmed: '#10B981', completed: '#3B5BDB', cancelled: '#EF4444' }
  const maxStatus = Math.max(1, ...Object.values(statusCounts))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Revenue card */}
      <div style={{ background: 'linear-gradient(135deg,#3B5BDB,#5B7AF5)', borderRadius: 16, padding: 24, color: '#fff', gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', gap: 40 }}>
          <div><p style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: '0 0 6px' }}>TOTAL REVENUE</p><p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>${(stats?.totalRevenue ?? 0).toLocaleString()}</p><p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>From {statusCounts.completed} completed appointments</p></div>
          <div><p style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: '0 0 6px' }}>THIS MONTH</p><p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{stats?.apptThisMonth ?? 0}</p><p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Appointments booked</p></div>
          <div><p style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: '0 0 6px' }}>NEW USERS</p><p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{stats?.newUsersThisWeek ?? 0}</p><p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Joined this week</p></div>
        </div>
      </div>

      {/* Appointment status chart */}
      <Section title="Appointments by Status" icon={<TrendingUp size={14} />}>
        {(Object.entries(statusCounts) as [string, number][]).map(([s, n]) => (
          <div key={s} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{s}</span>
              <span style={{ color: '#94A3B8' }}>{n}</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: statusColors[s], width: `${(n / maxStatus) * 100}%`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </Section>

      {/* User role breakdown */}
      <Section title="User Breakdown" icon={<Users size={14} />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {(Object.entries(roleBreakdown) as [string, number][]).map(([role, count]) => {
            const rs = roleStyle(role)
            return (
              <div key={role} style={{ background: rs.bg, borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: rs.text, margin: 0 }}>{count}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: rs.text, margin: '4px 0 0', textTransform: 'capitalize' }}>{role}s</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Top doctors */}
      <Section title="Top Doctors by Appointments" icon={<Stethoscope size={14} />} style={{ gridColumn: 'span 2' }}>
        {topDoctors.map((d, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Dr. {d.name}</span>
              <span style={{ color: '#94A3B8' }}>{d.count} appts</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: '#7C3AED', width: `${(d.count / maxAppts) * 100}%`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
        {topDoctors.length === 0 && <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No appointment data yet.</p>}
      </Section>
    </div>
  )
}

// ── Broadcast Tab ──────────────────────────────────────────────────────────────
function BroadcastTab({ onSend, flash }: { onSend: (t: string, b: string, a: 'all' | 'patients' | 'doctors') => Promise<{ message: string; sent: number }>; flash: (m: string) => void }) {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [audience, setAudience] = useState<'all' | 'patients' | 'doctors'>('all')
  const [sending, setSending]   = useState(false)

  const send = async () => {
    if (!title.trim() || !body.trim()) { flash('Title and message are required.'); return }
    setSending(true)
    try {
      const res = await onSend(title.trim(), body.trim(), audience)
      flash(res.message)
      setTitle(''); setBody('')
    } catch (e: any) { flash(e.message) }
    setSending(false)
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EBF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} color="#3B5BDB" /></div>
          <div><p style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', margin: 0 }}>Push Notification Broadcast</p><p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Sends to all devices with notifications enabled</p></div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Audience</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'patients', 'doctors'] as const).map(a => (
              <button key={a} onClick={() => setAudience(a)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  borderColor: audience === a ? '#3B5BDB' : '#E2E8F0',
                  background: audience === a ? '#EBF0FF' : '#fff',
                  color: audience === a ? '#3B5BDB' : '#64748B' }}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notification Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform Update"
            style={inputStyle} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
        </div>

        <button onClick={send} disabled={sending}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', background: sending ? '#94A3B8' : 'linear-gradient(135deg,#3B5BDB,#5B7AF5)', transition: 'opacity 0.2s' }}>
          {sending ? 'Sending…' : `Send to ${audience === 'all' ? 'Everyone' : audience}`}
        </button>
      </div>
    </div>
  )
}

// ── Shared primitives ──────────────────────────────────────────────────────────
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }

function Section({ title, icon, children, style }: { title: string; icon: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ color: '#3B5BDB' }}>{icon}</span>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      </div>
      {children}
    </div>
  )
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {headers.map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: bg, color, textTransform: 'capitalize' }}>{children}</span>
}

function Btn({ color, bg, onClick, children }: { color: string; bg: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color, background: bg, minHeight: 'unset', minWidth: 'unset' }}>
      {children}
    </button>
  )
}

function IconBtn({ color, bg, title, onClick, children }: { color: string; bg: string; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: bg, minHeight: 'unset', minWidth: 'unset' }}>
      {children}
    </button>
  )
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: 'relative', marginBottom: 16, flex: 1 }}>
      <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'inherit', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 12 }}>{children}</p>
}

function Empty({ text }: { text: string }) {
  return <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', padding: '32px 0' }}>{text}</p>
}
