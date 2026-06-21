import { useEffect, useState } from 'react'
import { Clock, Trash2, CheckCircle, XCircle, ChevronRight, Star, FileText, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getDoctorAppointments, updateAppointmentStatus,
  addAvailability, deleteAvailability, getAvailability,
  createDoctorProfile, updateDoctorProfile, getDoctors,
  saveConsultationNotes, changePassword
} from '../api'
import BottomNav from '../components/BottomNav'
import ChatScreen from '../components/ChatScreen'

type Appointment = {
  _id: string
  patient: { _id: string; name: string; email: string } | string
  date: string
  reason: string
  status: string
  notes?: string
  rating?: number
  review?: string
}
type Slot = { _id: string; day: string; startTime: string; endTime: string }
type Tab = 'home' | 'appointments' | 'messages' | 'profile'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function DoctorDashboard() {
  const { user, logout, token } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotForm, setSlotForm] = useState({ day: 'Monday', startTime: '09:00', endTime: '17:00' })
  const [slotMsg, setSlotMsg] = useState('')
  const [apptMsg, setApptMsg] = useState('')
  const [hasProfile, setHasProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ specialization: '', hospital: '', consultationFee: '', bio: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)

  // Chat
  const [chatAppt, setChatAppt] = useState<Appointment | null>(null)

  // Consultation notes
  const [notesFor, setNotesFor] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    getDoctorAppointments().then(setAppointments)
    if (user) {
      getAvailability(user.id).then(setSlots)
      getDoctors().then((docs: any[]) => {
        const me = docs.find(d => d._id === user.id)
        if (me?.profile) {
          setHasProfile(true)
          setProfileForm({
            specialization: me.profile.specialization || '',
            hospital: me.profile.hospital || '',
            consultationFee: String(me.profile.consultationFee ?? ''),
            bio: me.profile.bio || ''
          })
        }
      })
    }
  }, [user])

  const patientName = (a: Appointment) =>
    typeof a.patient === 'object' ? a.patient.name : 'Patient'

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a))
      setApptMsg(`Appointment ${status}.`)
      setTimeout(() => setApptMsg(''), 3000)
    } catch (err: any) { setApptMsg(err.message) }
  }

  const handleMarkCompleted = (appt: Appointment) => {
    setNotesFor(appt._id)
    setNotesInput(appt.notes || '')
  }

  const handleSaveNotesAndComplete = async (id: string) => {
    setNotesSaving(true)
    try {
      if (notesInput.trim()) await saveConsultationNotes(id, notesInput.trim())
      await updateAppointmentStatus(id, 'completed')
      setAppointments(prev => prev.map(a =>
        a._id === id ? { ...a, status: 'completed', notes: notesInput.trim() } : a
      ))
      setNotesFor(null)
      setNotesInput('')
    } catch (err: any) { setApptMsg(err.message) }
    finally { setNotesSaving(false) }
  }

  const handleAddSlot = async () => {
    setSlotMsg('')
    try {
      const res = await addAvailability(slotForm) as any
      setSlots(prev => [...prev, res.availability])
      setSlotMsg('Slot added successfully.')
      setTimeout(() => setSlotMsg(''), 3000)
    } catch (err: any) { setSlotMsg(err.message) }
  }

  const handleDeleteSlot = async (id: string) => {
    try {
      await deleteAvailability(id)
      setSlots(prev => prev.filter(s => s._id !== id))
    } catch (err: any) { setSlotMsg(err.message) }
  }

  const handleSaveProfile = async () => {
    setProfileMsg('')
    try {
      if (hasProfile) {
        await updateDoctorProfile({ ...profileForm, consultationFee: Number(profileForm.consultationFee) })
        setEditingProfile(false)
        setProfileMsg('Profile updated successfully!')
      } else {
        await createDoctorProfile({ ...profileForm, consultationFee: Number(profileForm.consultationFee) })
        setHasProfile(true)
        setProfileMsg('Profile created successfully!')
      }
    } catch (err: any) { setProfileMsg(err.message) }
  }

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg('New passwords do not match.')
      return
    }
    setPwLoading(true)
    setPwMsg('')
    try {
      await changePassword(pwForm.current, pwForm.next)
      setPwMsg('Password changed successfully.')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: any) { setPwMsg(err.message) }
    finally { setPwLoading(false) }
  }

  const statusColor = (s: string) => ({
    pending:   { bg: '#FEF3C7', text: '#92400E' },
    confirmed: { bg: '#D1FAE5', text: '#065F46' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    completed: { bg: '#DBEAFE', text: '#1E40AF' },
  }[s] ?? { bg: '#F3F4F6', text: '#374151' })

  const pending  = appointments.filter(a => a.status === 'pending')
  const upcoming = appointments.filter(a => a.status === 'confirmed')

  return (
    <div className="app-shell" style={{ background: '#F8F9FE' }}>

      {/* ── HOME ── */}
      {tab === 'home' && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-6" style={{ background: '#EBF0FF' }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm" style={{ color: '#6B7280' }}>Welcome back,</p>
                <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>
                  Dr. {user?.name ?? '—'} 👋
                </h2>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: '#3B5BDB' }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
              </div>
            </div>
          </div>

          <div className="px-6 mt-5">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-2xl font-bold" style={{ color: '#3B5BDB' }}>{pending.length}</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Pending Requests</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{upcoming.length}</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Upcoming</p>
              </div>
            </div>

            {pending.length > 0 && (
              <>
                <h3 className="font-semibold mb-3" style={{ color: '#1B1B2F' }}>Pending Approvals</h3>
                <div className="space-y-3 mb-6">
                  {pending.map(a => (
                    <div key={a._id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                      <p className="text-xs font-medium mb-1" style={{ color: '#3B5BDB' }}>{patientName(a)}</p>
                      <div className="flex items-center gap-1 mb-3">
                        <Clock size={12} style={{ color: '#9CA3AF' }} />
                        <span className="text-xs" style={{ color: '#6B7280' }}>{new Date(a.date).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusUpdate(a._id, 'confirmed')}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: '#D1FAE5', color: '#065F46' }}>
                          <CheckCircle size={13} /> Confirm
                        </button>
                        <button onClick={() => handleStatusUpdate(a._id, 'cancelled')}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          <XCircle size={13} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>My Availability</h3>
                <button onClick={() => setTab('messages')} className="flex items-center gap-1 text-xs" style={{ color: '#3B5BDB' }}>
                  Manage <ChevronRight size={13} />
                </button>
              </div>
              {slots.length === 0
                ? <p className="text-xs" style={{ color: '#9CA3AF' }}>No slots set. Add your availability.</p>
                : slots.slice(0, 3).map(s => (
                    <div key={s._id} className="flex justify-between text-xs py-1.5 border-b last:border-0"
                      style={{ borderColor: '#F0F0F5' }}>
                      <span className="font-medium" style={{ color: '#1B1B2F' }}>{s.day}</span>
                      <span style={{ color: '#6B7280' }}>{s.startTime} – {s.endTime}</span>
                    </div>
                  ))
              }
            </div>

            {apptMsg && <p className="mt-3 text-sm text-center" style={{ color: '#3B5BDB' }}>{apptMsg}</p>}
          </div>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {tab === 'appointments' && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4" style={{ background: '#EBF0FF' }}>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Appointments</h2>
          </div>
          {apptMsg && (
            <div className="mx-6 mt-3 p-3 rounded-xl text-sm text-center" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>{apptMsg}</div>
          )}
          <div className="px-6 mt-4 space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-center py-12" style={{ color: '#9CA3AF' }}>No appointments yet.</p>
            )}
            {appointments.map(a => {
              const sc = statusColor(a.status)
              return (
                <div key={a._id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                  </div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#3B5BDB' }}>{patientName(a)}</p>
                  <div className="flex items-center gap-1 mb-3">
                    <Clock size={12} style={{ color: '#9CA3AF' }} />
                    <span className="text-xs" style={{ color: '#6B7280' }}>{new Date(a.date).toLocaleString()}</span>
                  </div>

                  {/* Existing notes */}
                  {a.notes && notesFor !== a._id && (
                    <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: '#F8F9FE', color: '#6B7280' }}>
                      <span className="font-medium" style={{ color: '#1B1B2F' }}>Notes: </span>{a.notes}
                    </div>
                  )}

                  {/* Notes inline form when marking completed */}
                  {notesFor === a._id && (
                    <div className="mb-3 space-y-2">
                      <textarea
                        value={notesInput}
                        onChange={e => setNotesInput(e.target.value)}
                        rows={3}
                        placeholder="Add consultation notes (optional)…"
                        className="input-field resize-none w-full text-sm"
                        style={{ paddingLeft: '0.75rem', paddingTop: '0.6rem', lineHeight: '1.5' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNotesAndComplete(a._id)}
                          disabled={notesSaving}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                          {notesSaving ? 'Saving…' : 'Save & Complete'}
                        </button>
                        <button
                          onClick={() => setNotesFor(null)}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: '#F3F4F6', color: '#6B7280' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rating badge on completed */}
                  {a.status === 'completed' && a.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={13} fill={n <= a.rating! ? '#F59E0B' : 'none'}
                          style={{ color: '#F59E0B' }} />
                      ))}
                      {a.review && <span className="text-xs ml-1" style={{ color: '#6B7280' }}>"{a.review}"</span>}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {a.status === 'pending' && <>
                      <button onClick={() => handleStatusUpdate(a._id, 'confirmed')}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>Confirm</button>
                      <button onClick={() => handleStatusUpdate(a._id, 'cancelled')}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#FEE2E2', color: '#DC2626' }}>Decline</button>
                    </>}
                    {a.status === 'confirmed' && notesFor !== a._id && (
                      <button onClick={() => handleMarkCompleted(a)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                        <FileText size={12} /> Mark Completed
                      </button>
                    )}
                    {['confirmed', 'completed'].includes(a.status) && (
                      <button onClick={() => setChatAppt(a)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                        <MessageCircle size={12} /> Chat
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── AVAILABILITY (messages tab) ── */}
      {tab === 'messages' && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4" style={{ background: '#EBF0FF' }}>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Availability</h2>
          </div>
          <div className="px-6 mt-4">
            {slotMsg && (
              <div className="mb-4 p-3 rounded-xl text-sm"
                style={{ background: slotMsg.includes('success') ? '#D1FAE5' : '#FEE2E2', color: slotMsg.includes('success') ? '#065F46' : '#DC2626' }}>
                {slotMsg}
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#1B1B2F' }}>Add Slot</h3>
              <div className="space-y-3">
                <select value={slotForm.day} onChange={e => setSlotForm(f => ({ ...f, day: e.target.value }))}
                  className="input-field" style={{ paddingLeft: '1rem' }}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="time" value={slotForm.startTime} onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))}
                    className="input-field" style={{ paddingLeft: '1rem' }} />
                  <input type="time" value={slotForm.endTime} onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))}
                    className="input-field" style={{ paddingLeft: '1rem' }} />
                </div>
                <button onClick={handleAddSlot} className="btn-primary">Add Slot</button>
              </div>
            </div>
            <div className="space-y-2">
              {slots.map(s => (
                <div key={s._id} className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="font-medium text-sm" style={{ color: '#1B1B2F' }}>{s.day}</span>
                    <span className="text-sm ml-2" style={{ color: '#6B7280' }}>{s.startTime} – {s.endTime}</span>
                  </div>
                  <button onClick={() => handleDeleteSlot(s._id)}>
                    <Trash2 size={16} style={{ color: '#E83F6F' }} />
                  </button>
                </div>
              ))}
              {slots.length === 0 && <p className="text-sm text-center py-4" style={{ color: '#9CA3AF' }}>No slots added yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="px-6 pt-12 pb-24">
          <h2 className="text-xl font-bold mb-6" style={{ color: '#1B1B2F' }}>Profile</h2>

          {/* Avatar + name */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
              style={{ background: '#3B5BDB' }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
            </div>
            <p className="font-semibold" style={{ color: '#1B1B2F' }}>Dr. {user?.name ?? '—'}</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>{user?.email ?? ''}</p>
          </div>

          {/* Doctor profile form */}
          {(!hasProfile || editingProfile) ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-4">
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#1B1B2F' }}>
                {hasProfile ? 'Edit Profile' : 'Complete Your Profile'}
              </h3>
              {profileMsg && (
                <div className="p-3 rounded-xl text-sm"
                  style={{ background: profileMsg.includes('success') ? '#D1FAE5' : '#FEE2E2', color: profileMsg.includes('success') ? '#065F46' : '#DC2626' }}>
                  {profileMsg}
                </div>
              )}
              {[
                { field: 'specialization', placeholder: 'Specialization (e.g. Cardiology)' },
                { field: 'hospital', placeholder: 'Hospital / Clinic' },
                { field: 'consultationFee', placeholder: 'Consultation Fee ($)', type: 'number' },
                { field: 'bio', placeholder: 'Short bio…' },
              ].map(({ field, placeholder, type }) => (
                <input key={field} type={type ?? 'text'} placeholder={placeholder}
                  value={(profileForm as any)[field]}
                  onChange={e => setProfileForm(f => ({ ...f, [field]: e.target.value }))}
                  className="input-field" style={{ paddingLeft: '1rem' }} />
              ))}
              <div className="flex gap-3">
                <button onClick={handleSaveProfile} className="btn-primary">
                  {hasProfile ? 'Update Profile' : 'Save Profile'}
                </button>
                {hasProfile && (
                  <button onClick={() => { setEditingProfile(false); setProfileMsg('') }}
                    className="btn-outline">Cancel</button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium" style={{ color: '#065F46' }}>✓ Profile set up</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  {profileForm.specialization} · {profileForm.hospital}
                </p>
              </div>
              <button onClick={() => { setEditingProfile(true); setProfileMsg('') }}
                className="text-xs font-medium px-3 py-1.5 rounded-xl"
                style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                Edit
              </button>
            </div>
          )}

          {/* Change password */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-4">
            <h3 className="font-semibold text-sm mb-1" style={{ color: '#1B1B2F' }}>Change Password</h3>
            {pwMsg && (
              <div className="p-3 rounded-xl text-sm"
                style={{ background: pwMsg.includes('success') ? '#D1FAE5' : '#FEE2E2', color: pwMsg.includes('success') ? '#065F46' : '#DC2626' }}>
                {pwMsg}
              </div>
            )}
            {[
              { key: 'current', placeholder: 'Current password' },
              { key: 'next',    placeholder: 'New password' },
              { key: 'confirm', placeholder: 'Confirm new password' },
            ].map(({ key, placeholder }) => (
              <input key={key} type="password" placeholder={placeholder}
                value={(pwForm as any)[key]}
                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                className="input-field" style={{ paddingLeft: '1rem' }} />
            ))}
            <button onClick={handleChangePassword} disabled={pwLoading} className="btn-primary">
              {pwLoading ? 'Saving…' : 'Change Password'}
            </button>
          </div>

          <button onClick={logout} className="btn-outline" style={{ borderColor: '#E83F6F', color: '#E83F6F' }}>Sign Out</button>
        </div>
      )}

      {chatAppt && (
        <div className="absolute inset-0" style={{ background: '#fff', zIndex: 50 }}>
          <ChatScreen
            appointmentId={chatAppt._id}
            appointmentLabel={patientName(chatAppt)}
            currentUserId={user?.id ?? ''}
            token={token ?? ''}
            onBack={() => setChatAppt(null)}
          />
        </div>
      )}

      <BottomNav active={tab} onTab={setTab} />
    </div>
  )
}
