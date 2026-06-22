import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Clock, Trash2, CheckCircle, XCircle, ChevronRight, Star, FileText, MessageCircle, Video, Activity, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getDoctorAppointments, updateAppointmentStatus,
  addAvailability, deleteAvailability, getAvailability,
  createDoctorProfile, updateDoctorProfile, getMyDoctorProfile,
  saveConsultationNotes, changePassword, getPatientHealthMetrics, getPatientMedicalProfile,
  savePrescription, getAppointmentPrescription
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
  const [profileVerified, setProfileVerified] = useState(false)
  const [profileForm, setProfileForm] = useState({ specialization: '', hospital: '', consultationFee: '', bio: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)

  // Chat
  const [chatAppt, setChatAppt] = useState<Appointment | null>(null)

  // Patient health metrics panel
  const [healthPatient, setHealthPatient] = useState<{ id: string; name: string } | null>(null)
  const [patientMetrics, setPatientMetrics] = useState<any[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [healthLive, setHealthLive] = useState(false)
  const healthSocketRef = useRef<Socket | null>(null)

  // Patient medical profiles cache
  const [medProfiles, setMedProfiles] = useState<Record<string, any>>({})
  const [medOpen, setMedOpen] = useState<string | null>(null)

  // Prescriptions
  type MedRow = { name: string; dosage: string; frequency: string; duration: string; instructions: string }
  const emptyMed = (): MedRow => ({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })
  const [rxFor, setRxFor] = useState<string | null>(null)
  const [rxMeds, setRxMeds] = useState<MedRow[]>([emptyMed()])
  const [rxNotes, setRxNotes] = useState('')
  const [rxSaving, setRxSaving] = useState(false)
  const [rxMsg, setRxMsg] = useState('')
  const [rxCache, setRxCache] = useState<Record<string, any>>({})

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
      getMyDoctorProfile().then((profile: any) => {
        if (profile) {
          setHasProfile(true)
          setProfileVerified(profile.verified === true)
          setProfileForm({
            specialization: profile.specialization || '',
            hospital: profile.hospital || '',
            consultationFee: String(profile.consultationFee ?? ''),
            bio: profile.bio || ''
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
        setProfileMsg('Profile updated. Changes are pending re-verification.')
      } else {
        await createDoctorProfile({ ...profileForm, consultationFee: Number(profileForm.consultationFee) })
        setHasProfile(true)
        setProfileVerified(false)
        setProfileMsg('Profile submitted for admin verification.')
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

  const handleOpenRx = async (appt: Appointment) => {
    setRxFor(appt._id); setRxMsg('')
    if (!rxCache[appt._id]) {
      try {
        const existing = await getAppointmentPrescription(appt._id) as any
        if (existing) {
          setRxCache(prev => ({ ...prev, [appt._id]: existing }))
          setRxMeds(existing.medications)
          setRxNotes(existing.notes || '')
        } else { setRxMeds([emptyMed()]); setRxNotes('') }
      } catch { setRxMeds([emptyMed()]); setRxNotes('') }
    } else {
      const ex = rxCache[appt._id]
      setRxMeds(ex.medications); setRxNotes(ex.notes || '')
    }
  }

  const handleSaveRx = async (appointmentId: string) => {
    const valid = rxMeds.filter(m => m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim())
    if (!valid.length) { setRxMsg('Add at least one complete medication.'); return }
    setRxSaving(true); setRxMsg('')
    try {
      const res = await savePrescription({ appointmentId, medications: valid, notes: rxNotes }) as any
      setRxCache(prev => ({ ...prev, [appointmentId]: res.prescription }))
      setRxMsg('Prescription saved.')
      setTimeout(() => { setRxMsg(''); setRxFor(null) }, 1500)
    } catch (err: any) { setRxMsg(err.message) }
    finally { setRxSaving(false) }
  }

  const handleToggleMedProfile = async (appt: Appointment) => {
    const patientId = typeof appt.patient === 'object' ? appt.patient._id : appt.patient
    if (medOpen === patientId) { setMedOpen(null); return }
    setMedOpen(patientId)
    if (!medProfiles[patientId]) {
      try {
        const profile = await getPatientMedicalProfile(patientId)
        setMedProfiles(prev => ({ ...prev, [patientId]: profile }))
      } catch { setMedProfiles(prev => ({ ...prev, [patientId]: null })) }
    }
  }

  const handleViewHealth = async (appt: Appointment) => {
    const patientId = typeof appt.patient === 'object' ? appt.patient._id : appt.patient
    const name = patientName(appt)
    setHealthPatient({ id: patientId, name })
    setPatientMetrics([])
    setMetricsLoading(true)

    // Subscribe to live updates for this patient's health room
    if (healthSocketRef.current) healthSocketRef.current.disconnect()
    const socket = io('http://localhost:5000', { auth: { token } })
    healthSocketRef.current = socket
    socket.on('connect', () => {
      setHealthLive(true)
      // Join patient's health room — server uses same room key
      socket.emit('join-health-patient', patientId)
    })
    socket.on('disconnect', () => setHealthLive(false))
    socket.on('health-update', (metric: any) => {
      setPatientMetrics(prev => [metric, ...prev])
    })

    try {
      const data = await getPatientHealthMetrics(patientId)
      setPatientMetrics(data)
    } catch { /* patient may have no devices */ }
    finally { setMetricsLoading(false) }
  }

  const handleCloseHealth = () => {
    setHealthPatient(null)
    if (healthSocketRef.current) { healthSocketRef.current.disconnect(); healthSocketRef.current = null }
    setHealthLive(false)
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
          <div className="header-gradient px-6 pt-12 pb-8">
            <div className="flex justify-between items-center mb-4" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'} 👋
                </p>
                <h2 className="text-2xl font-bold text-white mt-0.5">Dr. {user?.name?.split(' ')[0] ?? '—'}</h2>
              </div>
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)' }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
              </div>
            </div>
            <div className="flex gap-3" style={{ position: 'relative', zIndex: 1 }}>
              {[
                { label: 'Pending', value: appointments.filter(a => a.status === 'pending').length, icon: '⏳' },
                { label: 'Confirmed', value: appointments.filter(a => a.status === 'confirmed').length, icon: '✅' },
                { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, icon: '🏥' },
              ].map(s => (
                <div key={s.label} className="flex-1 rounded-2xl px-3 py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                  <p className="text-sm">{s.icon}</p>
                  <p className="text-base font-bold text-white">{s.value}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Verification banner */}
          {hasProfile && !profileVerified && (
            <div className="mx-6 mt-4 p-4 rounded-2xl flex items-start gap-3"
              style={{ background: '#FEF3C7' }}>
              <span className="text-lg flex-shrink-0">⏳</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#92400E' }}>Pending Verification</p>
                <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>
                  Your profile is awaiting admin approval. You won't appear in patient search until verified.
                </p>
              </div>
            </div>
          )}

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
          <div className="header-gradient px-6 pt-12 pb-6">
            <h2 className="text-2xl font-bold text-white" style={{ position: 'relative', zIndex: 1 }}>Appointments</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>Manage your patient schedule</p>
          </div>
          {apptMsg && (
            <div className="mx-6 mt-3 p-3 rounded-2xl text-sm text-center" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>{apptMsg}</div>
          )}
          <div className="px-6 mt-4 space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-center py-12" style={{ color: '#9CA3AF' }}>No appointments yet.</p>
            )}
            {appointments.map(a => {
              const sc = statusColor(a.status)
              const statusBorder: Record<string, string> = {
                pending: '#F59E0B', confirmed: '#10B981', completed: '#3B5BDB', cancelled: '#EF4444'
              }
              const apptDate = new Date(a.date)
              return (
                <div key={a._id} className="bg-white rounded-2xl overflow-hidden fade-up"
                  style={{ boxShadow: '0 2px 12px rgba(27,27,47,0.07)', borderLeft: `4px solid ${statusBorder[a.status] ?? '#E5E7EB'}` }}>
                  <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm flex-1 mr-2" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0"
                      style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                  </div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#3B5BDB' }}>{patientName(a)}</p>
                  <div className="flex items-center gap-1 mb-3 px-2 py-1.5 rounded-xl" style={{ background: '#F8F9FE' }}>
                    <Clock size={12} style={{ color: '#9CA3AF' }} />
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      {apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>·</span>
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      {apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
                      <a
                        href={`https://meet.jit.si/chipatara-${a._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <Video size={12} /> Join Video Call
                      </a>
                    )}
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
                    {['confirmed', 'completed'].includes(a.status) && (
                      <button onClick={() => handleViewHealth(a)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: '#ECFDF5', color: '#059669' }}>
                        <Activity size={12} /> Health
                      </button>
                    )}
                    <button onClick={() => handleToggleMedProfile(a)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                      style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                      🩺 Medical
                    </button>
                    {a.status === 'completed' && (
                      <button onClick={() => rxFor === a._id ? setRxFor(null) : handleOpenRx(a)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: rxCache[a._id] ? '#D1FAE5' : '#FEF3C7', color: rxCache[a._id] ? '#065F46' : '#92400E' }}>
                        💊 {rxCache[a._id] ? 'Prescription ✓' : 'Prescribe'}
                      </button>
                    )}
                  </div>

                  {/* Prescription form */}
                  {rxFor === a._id && (
                    <div className="mt-3 p-4 rounded-2xl space-y-3" style={{ background: '#FFFBEB' }}>
                      <p className="font-bold text-xs" style={{ color: '#92400E' }}>PRESCRIPTION</p>
                      {rxMsg && <p className="text-xs" style={{ color: rxMsg.includes('saved') ? '#065F46' : '#DC2626' }}>{rxMsg}</p>}
                      {rxMeds.map((med, i) => (
                        <div key={i} className="bg-white rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-medium" style={{ color: '#92400E' }}>Medication {i + 1}</p>
                            {rxMeds.length > 1 && (
                              <button onClick={() => setRxMeds(prev => prev.filter((_, j) => j !== i))}
                                className="text-xs" style={{ color: '#DC2626' }}>Remove</button>
                            )}
                          </div>
                          {[
                            { key: 'name', placeholder: 'Drug name (e.g. Amoxicillin)' },
                            { key: 'dosage', placeholder: 'Dosage (e.g. 500mg)' },
                            { key: 'frequency', placeholder: 'Frequency (e.g. 3x daily)' },
                            { key: 'duration', placeholder: 'Duration (e.g. 7 days)' },
                            { key: 'instructions', placeholder: 'Instructions (e.g. take with food)' },
                          ].map(({ key, placeholder }) => (
                            <input key={key} type="text" placeholder={placeholder}
                              value={(med as any)[key]}
                              onChange={e => setRxMeds(prev => prev.map((m, j) => j === i ? { ...m, [key]: e.target.value } : m))}
                              className="input-field text-xs w-full" style={{ paddingLeft: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }} />
                          ))}
                        </div>
                      ))}
                      <button onClick={() => setRxMeds(prev => [...prev, emptyMed()])}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl w-full"
                        style={{ background: '#FEF3C7', color: '#92400E' }}>
                        + Add Another Medication
                      </button>
                      <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                        placeholder="Additional notes (optional)…" rows={2}
                        className="input-field resize-none w-full text-xs"
                        style={{ paddingLeft: '0.75rem', paddingTop: '0.5rem' }} />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveRx(a._id)} disabled={rxSaving}
                          className="text-xs font-medium px-4 py-1.5 rounded-xl"
                          style={{ background: '#D97706', color: '#fff' }}>
                          {rxSaving ? 'Saving…' : 'Save Prescription'}
                        </button>
                        <button onClick={() => setRxFor(null)}
                          className="text-xs font-medium px-4 py-1.5 rounded-xl"
                          style={{ background: '#F3F4F6', color: '#6B7280' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Inline medical profile panel */}
                  {medOpen === (typeof a.patient === 'object' ? a.patient._id : a.patient) && (() => {
                    const pid = typeof a.patient === 'object' ? a.patient._id : a.patient
                    const mp = medProfiles[pid]
                    if (mp === undefined) return (
                      <div className="mt-3 text-xs text-center py-2" style={{ color: '#9CA3AF' }}>Loading…</div>
                    )
                    if (!mp) return (
                      <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: '#F8F9FE', color: '#9CA3AF' }}>
                        Patient has not filled in their medical history yet.
                      </div>
                    )
                    return (
                      <div className="mt-3 p-4 rounded-2xl space-y-1.5 text-xs" style={{ background: '#FAF5FF' }}>
                        <p className="font-bold text-xs mb-2" style={{ color: '#7C3AED' }}>MEDICAL HISTORY</p>
                        {[
                          { label: 'Blood Type', value: mp.bloodType },
                          { label: 'Allergies', value: mp.allergies },
                          { label: 'Chronic Conditions', value: mp.chronicConditions },
                          { label: 'Current Medications', value: mp.currentMedications },
                          { label: 'Emergency Contact', value: mp.emergencyContactName ? `${mp.emergencyContactName} ${mp.emergencyContactPhone}` : null },
                        ].filter(r => r.value && r.value !== 'Unknown').map(r => (
                          <div key={r.label} className="flex gap-2">
                            <span className="font-medium flex-shrink-0" style={{ color: '#6B7280', minWidth: 120 }}>{r.label}:</span>
                            <span style={{ color: '#1B1B2F' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
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
          <div className="header-gradient px-6 pt-12 pb-6">
            <h2 className="text-2xl font-bold text-white" style={{ position: 'relative', zIndex: 1 }}>Availability</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}>Set your working hours</p>
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

      {healthPatient && (
        <div className="absolute inset-0 overflow-y-auto" style={{ background: '#F8F9FE', zIndex: 50 }}>
          <div className="px-6 pt-12 pb-4 flex items-center gap-3 sticky top-0" style={{ background: '#ECFDF5' }}>
            <button onClick={handleCloseHealth}><X size={20} style={{ color: '#059669' }} /></button>
            <div className="flex-1">
              <h2 className="text-base font-bold" style={{ color: '#1B1B2F' }}>{healthPatient.name}</h2>
              <p className="text-xs" style={{ color: '#6B7280' }}>Health Metrics</p>
            </div>
            {healthLive ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: '#D1FAE5', color: '#065F46' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#059669' }} />
                LIVE
              </span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>Connecting…</span>
            )}
          </div>
          <div className="px-6 py-5">
            {metricsLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#D1FAE5', borderTopColor: '#059669' }} />
              </div>
            )}
            {!metricsLoading && patientMetrics.length === 0 && (
              <div className="text-center py-12">
                <Activity size={40} style={{ color: '#D1FAE5', margin: '0 auto 12px' }} />
                <p className="font-medium text-sm" style={{ color: '#1B1B2F' }}>No health data available</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>This patient hasn't connected a device yet.</p>
              </div>
            )}
            {!metricsLoading && patientMetrics.length > 0 && (() => {
              const latest = patientMetrics[0]
              const items = [
                { label: 'Heart Rate', value: latest.heartRate, unit: 'bpm', icon: '💓', alert: latest.heartRate != null && (latest.heartRate > 120 || latest.heartRate < 40) },
                { label: 'Blood Oxygen', value: latest.spO2, unit: '%', icon: '🩸', alert: latest.spO2 != null && latest.spO2 < 94 },
                { label: 'Steps', value: latest.steps, unit: 'steps', icon: '👟', alert: false },
                { label: 'Temperature', value: latest.temperature, unit: '°C', icon: '🌡️', alert: latest.temperature != null && latest.temperature > 38.5 },
                { label: 'BP', value: latest.systolic != null ? `${latest.systolic}/${latest.diastolic ?? '?'}` : null, unit: 'mmHg', icon: '🫀', alert: latest.systolic != null && latest.systolic > 140 },
                { label: 'Sleep', value: latest.sleepHours, unit: 'hrs', icon: '😴', alert: false },
              ].filter(m => m.value != null)
              return (
                <>
                  <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#9CA3AF' }}>LATEST READINGS</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {items.map(m => (
                      <div key={m.label} className="bg-white rounded-2xl p-4 shadow-sm"
                        style={{ border: m.alert ? '1.5px solid #FCA5A5' : 'none' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{m.icon}</span>
                          {m.alert && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>!</span>}
                        </div>
                        <p className="text-xl font-bold" style={{ color: m.alert ? '#DC2626' : '#1B1B2F' }}>{m.value}</p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{m.unit}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                    Last update: {new Date(latest.timestamp).toLocaleString()}
                    {latest.device?.name && ` · ${latest.device.name}`}
                  </p>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#9CA3AF' }}>HISTORY</p>
                  <div className="space-y-2">
                    {patientMetrics.slice(0, 10).map((m: any, i: number) => (
                      <div key={i} className="bg-white rounded-xl px-4 py-3 flex flex-wrap gap-3 shadow-sm">
                        <span className="text-xs font-medium" style={{ color: '#9CA3AF', minWidth: '100%' }}>
                          {new Date(m.timestamp).toLocaleString()}
                        </span>
                        {m.heartRate != null && <span className="text-xs">💓 {m.heartRate} bpm</span>}
                        {m.spO2 != null && <span className="text-xs">🩸 {m.spO2}%</span>}
                        {m.steps != null && <span className="text-xs">👟 {m.steps}</span>}
                        {m.temperature != null && <span className="text-xs">🌡️ {m.temperature}°C</span>}
                        {m.systolic != null && <span className="text-xs">🫀 {m.systolic}/{m.diastolic ?? '?'}</span>}
                        {m.sleepHours != null && <span className="text-xs">😴 {m.sleepHours}h</span>}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
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

      <BottomNav
        active={tab}
        onTab={setTab}
        badges={{
          appointments: appointments.filter(a => a.status === 'pending').length,
        }}
      />
    </div>
  )
}
