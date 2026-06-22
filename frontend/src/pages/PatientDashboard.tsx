import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { MapPin, ChevronRight, X, Clock, Search, Brain, Star, Video, Activity, Trash2, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getDoctors, getSpecializations, getAvailability, bookAppointment,
  getPatientAppointments, cancelAppointment, checkSymptoms, type SymptomResult,
  rateAppointment, changePassword,
  registerDevice, getMyDevices, deleteDevice, getMyHealthMetrics,
  getMyMedicalProfile, saveMedicalProfile,
  getAppointmentPrescription, rescheduleAppointment
} from '../api'
import BottomNav from '../components/BottomNav'
import PaymentSummary from './PaymentSummary'
import ChatScreen from '../components/ChatScreen'

type Doctor = { _id: string; name: string; email: string; profile: any }
type Slot = { _id: string; day: string; startTime: string; endTime: string }
type Appointment = { _id: string; doctor: { _id: string; name: string } | string; date: string; reason: string; status: string; notes?: string; rating?: number; review?: string }
type Tab = 'home' | 'appointments' | 'messages' | 'profile'

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [specializations, setSpecializations] = useState<string[]>([])
  const [minFee, setMinFee] = useState('')
  const [maxFee, setMaxFee] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [availability, setAvailability] = useState<Slot[]>([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [bookMsg, setBookMsg] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptMsg, setApptMsg] = useState('')
  const [showBooking, setShowBooking] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [aiSymptoms, setAiSymptoms] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<SymptomResult | null>(null)
  const [aiError, setAiError] = useState('')

  // Ratings
  const [ratingFor, setRatingFor] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [ratingMsg, setRatingMsg] = useState('')

  // Chat
  const [chatAppt, setChatAppt] = useState<Appointment | null>(null)
  const { token } = useAuth()

  // Health monitoring
  const [showHealth, setShowHealth] = useState(false)
  const [devices, setDevices] = useState<any[]>([])
  const [healthMetrics, setHealthMetrics] = useState<any[]>([])
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [addDeviceForm, setAddDeviceForm] = useState({ name: '', type: 'smartwatch' })
  const [newDevice, setNewDevice] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const [newDataFlash, setNewDataFlash] = useState(false)
  const healthSocketRef = useRef<Socket | null>(null)

  // Rescheduling
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')

  // Prescriptions
  const [rxOpen, setRxOpen] = useState<string | null>(null)
  const [rxCache, setRxCache] = useState<Record<string, any>>({})

  // Medical profile
  const [medForm, setMedForm] = useState({ bloodType: 'Unknown', allergies: '', chronicConditions: '', currentMedications: '', emergencyContactName: '', emergencyContactPhone: '' })
  const [medMsg, setMedMsg] = useState('')
  const [medLoading, setMedLoading] = useState(false)

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => { getSpecializations().then(setSpecializations) }, [])
  useEffect(() => {
    getDoctors(
      search, specialization,
      minFee !== '' ? Number(minFee) : undefined,
      maxFee !== '' ? Number(maxFee) : undefined,
      minRating > 0 ? minRating : undefined
    ).then(setDoctors)
  }, [search, specialization, minFee, maxFee, minRating])
  useEffect(() => {
    if (tab === 'appointments' || tab === 'messages') getPatientAppointments().then(setAppointments)
    if (tab === 'profile') {
      getMyMedicalProfile().then((p: any) => {
        if (p) setMedForm({ bloodType: p.bloodType || 'Unknown', allergies: p.allergies || '', chronicConditions: p.chronicConditions || '', currentMedications: p.currentMedications || '', emergencyContactName: p.emergencyContactName || '', emergencyContactPhone: p.emergencyContactPhone || '' })
      }).catch(() => {})
    }
  }, [tab])

  // Real-time health socket — connect when health screen opens, disconnect on close
  useEffect(() => {
    if (!showHealth || !token) return

    const socket = io('http://localhost:5000', { auth: { token } })
    healthSocketRef.current = socket

    socket.on('connect', () => {
      setLiveConnected(true)
      socket.emit('join-health')
    })
    socket.on('disconnect', () => setLiveConnected(false))

    socket.on('health-update', (metric: any) => {
      setHealthMetrics(prev => [metric, ...prev])
      setNewDataFlash(true)
      setTimeout(() => setNewDataFlash(false), 1500)
    })

    return () => {
      socket.disconnect()
      healthSocketRef.current = null
      setLiveConnected(false)
    }
  }, [showHealth, token])

  const loadHealthData = () => {
    setHealthLoading(true)
    Promise.all([getMyDevices(), getMyHealthMetrics()])
      .then(([devs, metrics]) => { setDevices(devs); setHealthMetrics(metrics) })
      .catch(() => {})
      .finally(() => setHealthLoading(false))
  }

  const handleOpenHealth = () => {
    setShowHealth(true)
    setNewDevice(null)
    setShowAddDevice(false)
    loadHealthData()
  }

  const handleAddDevice = async () => {
    if (!addDeviceForm.name.trim()) return
    try {
      const res = await registerDevice(addDeviceForm) as any
      setNewDevice(res.device)
      setDevices(prev => [res.device, ...prev])
      setShowAddDevice(false)
      setAddDeviceForm({ name: '', type: 'smartwatch' })
    } catch { /* silently fail */ }
  }

  const handleDeleteDevice = async (id: string) => {
    await deleteDevice(id)
    setDevices(prev => prev.filter(d => d._id !== id))
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    })
  }

  const selectDoctor = async (doc: Doctor) => {
    setSelectedDoctor(doc)
    const slots = await getAvailability(doc._id)
    setAvailability(slots)
    setBookMsg(''); setDate(''); setReason('')
    setShowBooking(true)
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelAppointment(id)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'cancelled' } : a))
    } catch (err: any) { setApptMsg(err.message) }
  }

  const handleSubmitRating = async (id: string) => {
    if (!ratingValue) return
    try {
      await rateAppointment(id, ratingValue, reviewText)
      setAppointments(prev => prev.map(a =>
        a._id === id ? { ...a, rating: ratingValue, review: reviewText } : a
      ))
      setRatingFor(null); setRatingValue(0); setReviewText('')
      setRatingMsg('Thank you for your feedback!')
      setTimeout(() => setRatingMsg(''), 3000)
    } catch (err: any) { setRatingMsg(err.message) }
  }

  const handleReschedule = async (id: string) => {
    if (!rescheduleDate) return
    try {
      await rescheduleAppointment(id, rescheduleDate)
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'pending', date: rescheduleDate } : a))
      setRescheduleFor(null); setRescheduleDate('')
      setApptMsg('Appointment rescheduled. Awaiting doctor confirmation.')
      setTimeout(() => setApptMsg(''), 4000)
    } catch (err: any) { setApptMsg(err.message) }
  }

  const handleSaveMedical = async () => {
    setMedLoading(true); setMedMsg('')
    try {
      await saveMedicalProfile(medForm)
      setMedMsg('Medical profile saved.')
      setTimeout(() => setMedMsg(''), 3000)
    } catch (err: any) { setMedMsg(err.message) }
    finally { setMedLoading(false) }
  }

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg('New passwords do not match.'); return }
    setPwLoading(true); setPwMsg('')
    try {
      await changePassword(pwForm.current, pwForm.next)
      setPwMsg('Password changed successfully.')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err: any) { setPwMsg(err.message) }
    finally { setPwLoading(false) }
  }

  const statusColor = (s: string) => ({
    pending: { bg: '#FEF3C7', text: '#92400E' },
    confirmed: { bg: '#D1FAE5', text: '#065F46' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    completed: { bg: '#DBEAFE', text: '#1E40AF' },
  }[s] ?? { bg: '#F3F4F6', text: '#374151' })

  const urgencyStyle = (u: string) => ({
    emergency: { bg: '#FEE2E2', text: '#991B1B' },
    high:      { bg: '#FEE2E2', text: '#991B1B' },
    medium:    { bg: '#FEF3C7', text: '#92400E' },
    low:       { bg: '#D1FAE5', text: '#065F46' },
  }[u] ?? { bg: '#F3F4F6', text: '#374151' })

  const likelihoodStyle = (l: string) => ({
    high:   { background: '#FEE2E2', color: '#991B1B' },
    medium: { background: '#FEF3C7', color: '#92400E' },
    low:    { background: '#F3F4F6', color: '#6B7280' },
  }[l] ?? { background: '#F3F4F6', color: '#6B7280' })

  const handleCheckSymptoms = async () => {
    if (!aiSymptoms.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    try {
      const result = await checkSymptoms(aiSymptoms)
      setAiResult(result)
    } catch (err: any) {
      setAiError(err.message || 'AI service unavailable. Make sure it is running on port 5001.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="app-shell" style={{ background: '#F8F9FE' }}>
      {/* ── HOME TAB ── */}
      {tab === 'home' && !showAI && (
        <div className="pb-24">
          {/* Header */}
          <div className="px-6 pt-12 pb-6" style={{ background: '#EBF0FF' }}>
            <div className="flex justify-between items-center mb-1">
              <div>
                <p className="text-sm" style={{ color: '#6B7280' }}>Good morning,</p>
                <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>{user?.name ?? 'Patient'} 👋</h2>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#3B5BDB' }}>
                {user?.name?.charAt(0)?.toUpperCase() ?? 'P'}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <MapPin size={14} style={{ color: '#3B5BDB' }} />
              <span className="text-xs" style={{ color: '#6B7280' }}>Chipatara Telemedicine</span>
            </div>
          </div>

          {/* Appointment type cards */}
          <div className="px-6 mt-6">
            <h3 className="font-semibold mb-3" style={{ color: '#1B1B2F' }}>Who is this appointment for?</h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>This would help us connect you with the best available licensed Doctor for that location on our platform.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => { setTab('appointments'); setShowBooking(false) }}
                className="rounded-2xl p-4 text-left" style={{ background: '#FFEBE8' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FECACA' }}>
                  <span className="text-lg">✚</span>
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: '#1B1B2F' }}>New Health Concern</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Find a Doctor</p>
              </button>
              <button onClick={() => setTab('appointments')}
                className="rounded-2xl p-4 text-left" style={{ background: '#D1FAE5' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: '#A7F3D0' }}>
                  <span className="text-lg">🏥</span>
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: '#1B1B2F' }}>Existing or Chronic condition</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Talk to a Specialist</p>
              </button>
            </div>

            {/* Health Monitoring Banner */}
            <button
              onClick={handleOpenHealth}
              className="w-full rounded-2xl p-4 flex items-center gap-3 mb-3"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Activity size={20} color="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-white">Health Monitoring</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Connect your smartwatch · View live metrics</p>
              </div>
              <ChevronRight size={16} color="white" />
            </button>

            {/* AI Symptom Checker Banner */}
            <button
              onClick={() => { setShowAI(true); setAiResult(null); setAiError(''); setAiSymptoms('') }}
              className="w-full rounded-2xl p-4 flex items-center gap-3 mb-6"
              style={{ background: 'linear-gradient(135deg, #3B5BDB 0%, #4F6FF5 100%)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Brain size={20} color="white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-white">AI Symptom Checker</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Describe symptoms · Get instant guidance</p>
              </div>
              <ChevronRight size={16} color="white" />
            </button>

            {/* Search + Filter */}
            <h3 className="font-semibold mb-3" style={{ color: '#1B1B2F' }}>Available Doctors</h3>
            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#aab0c0' }} />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search doctors by name…"
                  className="input-field text-sm" style={{ paddingLeft: '2.25rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
                />
              </div>
              {specializations.length > 0 && (
                <select value={specialization} onChange={e => setSpecialization(e.target.value)}
                  className="input-field text-sm" style={{ paddingLeft: '1rem', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}>
                  <option value="">All specializations</option>
                  {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <button onClick={() => setShowFilters(f => !f)}
                className="w-full text-sm font-medium px-4 py-2 rounded-xl flex items-center justify-center gap-2"
                style={{ background: showFilters ? '#3B5BDB' : '#EBF0FF', color: showFilters ? '#fff' : '#3B5BDB' }}>
                {showFilters ? '▲ Hide Filters' : '▼ More Filters'}
              </button>
              {showFilters && (
                <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#374151' }}>Fee Range ($)</p>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Min" value={minFee} onChange={e => setMinFee(e.target.value)}
                        min={0} className="input-field text-sm flex-1" style={{ paddingLeft: '0.75rem' }} />
                      <input type="number" placeholder="Max" value={maxFee} onChange={e => setMaxFee(e.target.value)}
                        min={0} className="input-field text-sm flex-1" style={{ paddingLeft: '0.75rem' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Minimum Rating</p>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 4, 5].map(r => (
                        <button key={r} onClick={() => setMinRating(r)}
                          className="flex-1 text-xs font-medium py-1.5 rounded-xl transition-all"
                          style={{ background: minRating === r ? '#3B5BDB' : '#F3F4F6', color: minRating === r ? '#fff' : '#6B7280' }}>
                          {r === 0 ? 'Any' : `${r}★`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(minFee || maxFee || minRating > 0) && (
                    <button onClick={() => { setMinFee(''); setMaxFee(''); setMinRating(0) }}
                      className="text-xs font-medium px-3 py-1.5 rounded-xl"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}>Clear Filters</button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {doctors.map(doc => (
                <button key={doc._id} onClick={() => selectDoctor(doc)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: '#3B5BDB' }}>
                    {doc.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                        Video Consultation
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>Dr. {doc.name}</p>
                    <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                      {doc.profile ? `${doc.profile.specialization} · ${doc.profile.hospital}` : 'General Practitioner'}
                    </p>
                    {doc.profile?.consultationFee && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: '#3B5BDB' }}>Fee: ${doc.profile.consultationFee}</p>
                    )}
                  </div>
                  <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
                </button>
              ))}
              {doctors.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No doctors available yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEALTH MONITORING ── */}
      {showHealth && (
        <div className="pb-24" style={{ overflowY: 'auto', height: '100dvh' }}>
          <div className="px-6 pt-12 pb-4 flex items-center gap-3" style={{ background: '#ECFDF5' }}>
            <button onClick={() => setShowHealth(false)}><X size={20} style={{ color: '#059669' }} /></button>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Health Monitoring</h2>
            <div className="ml-auto flex items-center gap-2">
              {liveConnected ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: '#D1FAE5', color: '#065F46' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#059669' }} />
                  LIVE
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                  Connecting…
                </span>
              )}
              <button onClick={loadHealthData} className="text-xs font-medium px-3 py-1 rounded-xl"
                style={{ background: '#D1FAE5', color: '#065F46' }}>
                Refresh
              </button>
            </div>
          </div>

          <div className="px-6 mt-5">
            {healthLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#D1FAE5', borderTopColor: '#059669' }} />
              </div>
            )}

            {/* Latest readings */}
            {!healthLoading && healthMetrics.length > 0 && (() => {
              const latest = healthMetrics[0]
              const metrics = [
                { key: 'heartRate', label: 'Heart Rate', value: latest.heartRate, unit: 'bpm', icon: '💓', alert: latest.heartRate != null && (latest.heartRate > 120 || latest.heartRate < 40) },
                { key: 'spO2', label: 'Blood Oxygen', value: latest.spO2, unit: '%', icon: '🩸', alert: latest.spO2 != null && latest.spO2 < 94 },
                { key: 'steps', label: 'Steps', value: latest.steps, unit: 'steps', icon: '👟', alert: false },
                { key: 'temperature', label: 'Temperature', value: latest.temperature, unit: '°C', icon: '🌡️', alert: latest.temperature != null && latest.temperature > 38.5 },
                { key: 'systolic', label: 'Blood Pressure', value: latest.systolic != null ? `${latest.systolic}/${latest.diastolic ?? '?'}` : null, unit: 'mmHg', icon: '🫀', alert: latest.systolic != null && latest.systolic > 140 },
                { key: 'sleepHours', label: 'Sleep', value: latest.sleepHours, unit: 'hrs', icon: '😴', alert: false },
              ].filter(m => m.value != null)

              return metrics.length > 0 ? (
                <div className="mb-6">
                  <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#9CA3AF' }}>LATEST READINGS</p>
                  <div className="grid grid-cols-2 gap-3"
                    style={{ transition: 'opacity 0.3s', opacity: newDataFlash ? 0.6 : 1 }}>
                    {metrics.map(m => (
                      <div key={m.key} className="bg-white rounded-2xl p-4 shadow-sm"
                        style={{ border: m.alert ? '1.5px solid #FCA5A5' : 'none' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{m.icon}</span>
                          {m.alert && <span className="text-xs font-bold" style={{ color: '#DC2626' }}>!</span>}
                        </div>
                        <p className="text-xl font-bold" style={{ color: m.alert ? '#DC2626' : '#1B1B2F' }}>
                          {m.value}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>{m.unit}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-2 text-right" style={{ color: '#9CA3AF' }}>
                    Last update: {new Date(latest.timestamp).toLocaleString()}
                    {latest.device?.name && ` · ${latest.device.name}`}
                  </p>
                </div>
              ) : null
            })()}

            {/* No metrics yet */}
            {!healthLoading && healthMetrics.length === 0 && devices.length > 0 && (
              <div className="mb-5 p-4 rounded-2xl text-center" style={{ background: '#F8F9FE' }}>
                <p className="text-sm font-medium" style={{ color: '#1B1B2F' }}>No readings yet</p>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Your device hasn't sent data yet.</p>
              </div>
            )}

            {/* New device token card */}
            {newDevice && (
              <div className="mb-5 rounded-2xl p-4" style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7' }}>
                <p className="font-bold text-sm mb-1" style={{ color: '#065F46' }}>✅ Device Registered!</p>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Save this token — it's shown only once. Configure your device to POST to:
                </p>
                <code className="block text-xs mb-2 px-3 py-2 rounded-xl break-all"
                  style={{ background: '#fff', color: '#1B1B2F' }}>
                  POST http://localhost:5000/api/devices/ingest
                </code>
                <p className="text-xs mb-1 font-medium" style={{ color: '#065F46' }}>X-Device-Token header:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs px-3 py-2 rounded-xl break-all"
                    style={{ background: '#fff', color: '#1B1B2F' }}>
                    {newDevice.token}
                  </code>
                  <button onClick={() => copyToken(newDevice.token)}
                    className="flex-shrink-0 p-2 rounded-xl"
                    style={{ background: copiedToken ? '#D1FAE5' : '#fff' }}>
                    {copiedToken ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} style={{ color: '#6B7280' }} />}
                  </button>
                </div>
                <p className="text-xs mt-3 font-medium" style={{ color: '#065F46' }}>Sample JSON body:</p>
                <code className="block text-xs mt-1 px-3 py-2 rounded-xl" style={{ background: '#fff', color: '#6B7280' }}>
                  {'{ "heartRate": 72, "spO2": 98, "steps": 5000, "temperature": 36.8, "systolic": 120, "diastolic": 80, "sleepHours": 7.5 }'}
                </code>
              </div>
            )}

            {/* Connected devices */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>Connected Devices</p>
                {!showAddDevice && (
                  <button onClick={() => setShowAddDevice(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl"
                    style={{ background: '#D1FAE5', color: '#065F46' }}>
                    + Add Device
                  </button>
                )}
              </div>

              {/* Add device form */}
              {showAddDevice && (
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 space-y-3">
                  <input
                    type="text"
                    value={addDeviceForm.name}
                    onChange={e => setAddDeviceForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Device name (e.g. My Apple Watch)"
                    className="input-field text-sm"
                    style={{ paddingLeft: '1rem' }}
                  />
                  <select
                    value={addDeviceForm.type}
                    onChange={e => setAddDeviceForm(f => ({ ...f, type: e.target.value }))}
                    className="input-field text-sm"
                    style={{ paddingLeft: '1rem' }}>
                    <option value="smartwatch">Smartwatch</option>
                    <option value="fitness_band">Fitness Band</option>
                    <option value="custom">Custom Device</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleAddDevice}
                      className="text-xs font-medium px-4 py-1.5 rounded-xl"
                      style={{ background: '#059669', color: '#fff' }}>
                      Register
                    </button>
                    <button onClick={() => setShowAddDevice(false)}
                      className="text-xs font-medium px-4 py-1.5 rounded-xl"
                      style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {devices.length === 0 && !showAddDevice && (
                <div className="text-center py-8 rounded-2xl" style={{ background: '#F8F9FE' }}>
                  <Activity size={32} style={{ color: '#D1FAE5', margin: '0 auto 8px' }} />
                  <p className="text-sm font-medium" style={{ color: '#1B1B2F' }}>No devices connected</p>
                  <p className="text-xs mt-1 mb-3" style={{ color: '#9CA3AF' }}>Add your smartwatch or fitness tracker</p>
                  <button onClick={() => setShowAddDevice(true)}
                    className="text-xs font-medium px-4 py-2 rounded-xl"
                    style={{ background: '#059669', color: '#fff' }}>
                    + Add Device
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {devices.map(d => (
                  <div key={d._id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: d.active ? '#D1FAE5' : '#F3F4F6' }}>
                      <Activity size={18} style={{ color: d.active ? '#059669' : '#9CA3AF' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>{d.name}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {d.type.replace('_', ' ')} · {d.lastSeen ? `Last seen ${new Date(d.lastSeen).toLocaleDateString()}` : 'Never connected'}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteDevice(d._id)} className="p-2 rounded-xl"
                      style={{ background: '#FEE2E2' }}>
                      <Trash2 size={14} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI SYMPTOM CHECKER ── */}
      {showAI && (
        <div className="pb-24" style={{ overflowY: 'auto', height: '100dvh' }}>
          <div className="px-6 pt-12 pb-4 flex items-center gap-3" style={{ background: '#EBF0FF' }}>
            <button onClick={() => setShowAI(false)}><X size={20} style={{ color: '#3B5BDB' }} /></button>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>AI Symptom Checker</h2>
          </div>

          <div className="px-6 mt-6">
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Describe your symptoms in detail. Our AI will suggest possible conditions and recommend the right specialist.
            </p>

            <textarea
              value={aiSymptoms}
              onChange={e => setAiSymptoms(e.target.value)}
              rows={4}
              placeholder="e.g. I have had a persistent headache for 3 days, fever of 38°C, and a sore throat…"
              className="input-field resize-none w-full mb-4"
              style={{ paddingLeft: '1rem', paddingTop: '0.75rem', lineHeight: '1.6' }}
            />

            <button
              onClick={handleCheckSymptoms}
              disabled={aiLoading || !aiSymptoms.trim()}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
                  Analyzing…
                </>
              ) : (
                <><Brain size={16} /> Analyze Symptoms</>
              )}
            </button>

            {aiError && (
              <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                {aiError}
              </div>
            )}

            {aiResult && (
              <div className="mt-6 space-y-4">
                {/* Urgency */}
                {aiResult.urgency && (() => {
                  const us = urgencyStyle(aiResult.urgency)
                  return (
                    <div className="rounded-2xl p-4" style={{ background: us.bg }}>
                      <p className="text-sm font-bold" style={{ color: us.text }}>
                        Urgency: {aiResult.urgency.charAt(0).toUpperCase() + aiResult.urgency.slice(1)}
                        {aiResult.urgency === 'emergency' && ' — Seek emergency care immediately'}
                      </p>
                    </div>
                  )
                })()}

                {/* Possible Conditions */}
                {aiResult.conditions?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#9CA3AF' }}>POSSIBLE CONDITIONS</p>
                    <div className="space-y-2">
                      {aiResult.conditions.map((c, i) => {
                        const ls = likelihoodStyle(c.likelihood)
                        return (
                          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>{c.name}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={ls}>{c.likelihood}</span>
                            </div>
                            <p className="text-xs" style={{ color: '#6B7280' }}>{c.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recommended Specialists */}
                {aiResult.recommendedSpecialists?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold tracking-widest mb-3" style={{ color: '#9CA3AF' }}>RECOMMENDED SPECIALISTS</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {aiResult.recommendedSpecialists.map((s, i) => (
                        <button key={i}
                          onClick={() => { setSpecialization(s); setShowAI(false) }}
                          className="text-sm px-3 py-1.5 rounded-full font-medium"
                          style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Tap a specialty to filter available doctors</p>
                  </div>
                )}

                {/* Advice */}
                {aiResult.advice && (
                  <div className="rounded-2xl p-4" style={{ background: '#EBF0FF' }}>
                    <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#3B5BDB' }}>ADVICE</p>
                    <p className="text-sm" style={{ color: '#1B1B2F' }}>{aiResult.advice}</p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="rounded-xl p-3" style={{ background: '#FEF3C7' }}>
                  <p className="text-xs" style={{ color: '#92400E' }}>
                    ⚠️ {aiResult.disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {tab === 'appointments' && !showBooking && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4" style={{ background: '#EBF0FF' }}>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Appointments</h2>
          </div>
          <div className="px-6 mt-4">
            {apptMsg && <p className="text-sm mb-3" style={{ color: '#3B5BDB' }}>{apptMsg}</p>}
            {appointments.length === 0
              ? <p className="text-sm text-center py-12" style={{ color: '#9CA3AF' }}>No appointments yet. Go to Home to book one.</p>
              : appointments.map(a => {
                  const sc = statusColor(a.status)
                  return (
                    <div key={a._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                      </div>
                      <p className="text-xs font-medium mb-1" style={{ color: '#3B5BDB' }}>
                        Dr. {typeof a.doctor === 'object' ? a.doctor.name : a.doctor}
                      </p>
                      <div className="flex items-center gap-1 mb-3">
                        <Clock size={13} style={{ color: '#9CA3AF' }} />
                        <span className="text-xs" style={{ color: '#6B7280' }}>{new Date(a.date).toLocaleString()}</span>
                      </div>
                      {/* Join video call for confirmed appointments */}
                      {a.status === 'confirmed' && (
                        <a
                          href={`https://meet.jit.si/chipatara-${a._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl mb-2"
                          style={{ background: '#D1FAE5', color: '#065F46' }}>
                          <Video size={12} /> Join Video Call
                        </a>
                      )}

                      {/* Consultation notes from doctor */}
                      {a.status === 'completed' && a.notes && (
                        <div className="mb-2 p-3 rounded-xl text-xs" style={{ background: '#F8F9FE', color: '#6B7280' }}>
                          <span className="font-medium" style={{ color: '#1B1B2F' }}>Doctor's notes: </span>{a.notes}
                        </div>
                      )}

                      {['pending', 'confirmed'].includes(a.status) && rescheduleFor !== a._id && (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setRescheduleFor(a._id); setRescheduleDate(a.date.slice(0, 16)) }}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl"
                            style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                            Reschedule
                          </button>
                          <button onClick={() => handleCancel(a._id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl"
                            style={{ background: '#FEE2E2', color: '#DC2626' }}>
                            Cancel
                          </button>
                        </div>
                      )}
                      {rescheduleFor === a._id && (
                        <div className="mt-2 space-y-2">
                          <input type="datetime-local" value={rescheduleDate}
                            onChange={e => setRescheduleDate(e.target.value)}
                            className="input-field text-sm w-full" style={{ paddingLeft: '1rem' }} />
                          <div className="flex gap-2">
                            <button onClick={() => handleReschedule(a._id)}
                              className="text-xs font-medium px-3 py-1.5 rounded-xl"
                              style={{ background: '#3B5BDB', color: '#fff' }}>Confirm Reschedule</button>
                            <button onClick={() => setRescheduleFor(null)}
                              className="text-xs font-medium px-3 py-1.5 rounded-xl"
                              style={{ background: '#F3F4F6', color: '#6B7280' }}>Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Prescription */}
                      {a.status === 'completed' && (
                        <button
                          onClick={async () => {
                            if (rxOpen === a._id) { setRxOpen(null); return }
                            setRxOpen(a._id)
                            if (rxCache[a._id] === undefined) {
                              try {
                                const rx = await getAppointmentPrescription(a._id)
                                setRxCache(prev => ({ ...prev, [a._id]: rx }))
                              } catch { setRxCache(prev => ({ ...prev, [a._id]: null })) }
                            }
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl mb-2"
                          style={{ background: '#FEF3C7', color: '#92400E' }}>
                          💊 View Prescription
                        </button>
                      )}
                      {rxOpen === a._id && (
                        <div className="mb-3 p-4 rounded-2xl" style={{ background: '#FFFBEB' }}>
                          {rxCache[a._id] === undefined && <p className="text-xs" style={{ color: '#9CA3AF' }}>Loading…</p>}
                          {rxCache[a._id] === null && <p className="text-xs" style={{ color: '#9CA3AF' }}>No prescription issued for this appointment.</p>}
                          {rxCache[a._id] && (() => {
                            const rx = rxCache[a._id]
                            return (
                              <>
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-bold text-sm" style={{ color: '#92400E' }}>Prescription</p>
                                    <p className="text-xs" style={{ color: '#6B7280' }}>Dr. {rx.doctor?.name} · {new Date(rx.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <button onClick={() => window.print()}
                                    className="text-xs font-medium px-2 py-1 rounded-lg"
                                    style={{ background: '#FDE68A', color: '#92400E' }}>🖨 Print</button>
                                </div>
                                <div className="space-y-3">
                                  {rx.medications.map((m: any, i: number) => (
                                    <div key={i} className="bg-white rounded-xl p-3 text-xs space-y-0.5">
                                      <p className="font-bold" style={{ color: '#1B1B2F' }}>{i + 1}. {m.name}</p>
                                      <p style={{ color: '#6B7280' }}>Dosage: <span style={{ color: '#1B1B2F' }}>{m.dosage}</span></p>
                                      <p style={{ color: '#6B7280' }}>Frequency: <span style={{ color: '#1B1B2F' }}>{m.frequency}</span></p>
                                      <p style={{ color: '#6B7280' }}>Duration: <span style={{ color: '#1B1B2F' }}>{m.duration}</span></p>
                                      {m.instructions && <p style={{ color: '#6B7280' }}>Instructions: <span style={{ color: '#1B1B2F' }}>{m.instructions}</span></p>}
                                    </div>
                                  ))}
                                </div>
                                {rx.notes && <p className="mt-3 text-xs p-2 rounded-lg" style={{ background: '#FDE68A', color: '#92400E' }}>Note: {rx.notes}</p>}
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Rating for completed appointments */}
                      {a.status === 'completed' && !a.rating && ratingFor !== a._id && (
                        <button onClick={() => { setRatingFor(a._id); setRatingValue(0); setReviewText('') }}
                          className="text-xs font-medium px-3 py-1.5 rounded-xl"
                          style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                          Rate this appointment
                        </button>
                      )}

                      {a.status === 'completed' && a.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} size={14} fill={n <= a.rating! ? '#F59E0B' : 'none'}
                              style={{ color: '#F59E0B' }} />
                          ))}
                          {a.review && <span className="text-xs ml-1" style={{ color: '#6B7280' }}>"{a.review}"</span>}
                        </div>
                      )}

                      {ratingFor === a._id && (
                        <div className="mt-3 space-y-2 w-full">
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(n => (
                              <button key={n} onClick={() => setRatingValue(n)}>
                                <Star size={24} fill={n <= ratingValue ? '#F59E0B' : 'none'}
                                  style={{ color: '#F59E0B' }} />
                              </button>
                            ))}
                          </div>
                          <input
                            type="text" value={reviewText}
                            onChange={e => setReviewText(e.target.value)}
                            placeholder="Leave a comment (optional)"
                            className="input-field text-sm" style={{ paddingLeft: '1rem', paddingTop: '0.6rem', paddingBottom: '0.6rem' }}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSubmitRating(a._id)} disabled={!ratingValue}
                              className="text-xs font-medium px-3 py-1.5 rounded-xl"
                              style={{ background: ratingValue ? '#3B5BDB' : '#E5E7EB', color: ratingValue ? '#fff' : '#9CA3AF' }}>
                              Submit
                            </button>
                            <button onClick={() => setRatingFor(null)}
                              className="text-xs font-medium px-3 py-1.5 rounded-xl"
                              style={{ background: '#F3F4F6', color: '#6B7280' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
          </div>
        </div>
      )}

      {/* ── BOOKING SHEET ── */}
      {showBooking && !showPayment && selectedDoctor && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4 flex items-center gap-3" style={{ background: '#EBF0FF' }}>
            <button onClick={() => setShowBooking(false)}><X size={20} style={{ color: '#3B5BDB' }} /></button>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Book Appointment</h2>
          </div>
          <div className="px-6 mt-4">
            {/* Doctor card */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mb-5 shadow-sm">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#3B5BDB' }}>
                {selectedDoctor.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold" style={{ color: '#1B1B2F' }}>Dr. {selectedDoctor.name}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {selectedDoctor.profile ? `${selectedDoctor.profile.specialization} · ${selectedDoctor.profile.hospital}` : 'General Practitioner'}
                </p>
              </div>
            </div>

            {/* Availability */}
            {availability.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-medium mb-2" style={{ color: '#1B1B2F' }}>Available Slots</p>
                <div className="flex flex-wrap gap-2">
                  {availability.map(s => (
                    <span key={s._id} className="text-xs px-3 py-1.5 rounded-full font-medium"
                      style={{ background: '#D1FAE5', color: '#065F46' }}>
                      {s.day} {s.startTime}–{s.endTime}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1B1B2F' }}>Date & Time</label>
                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                  className="input-field" style={{ paddingLeft: '1rem' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1B1B2F' }}>Reason for visit</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Describe your symptoms…" className="input-field" style={{ paddingLeft: '1rem' }} />
              </div>
              <button
                onClick={() => {
                  if (!date || !reason) { setBookMsg('Please fill in date and reason.'); return }
                  setBookMsg('')
                  setShowPayment(true)
                }}
                className="btn-primary"
              >
                Review & Pay
              </button>
              {bookMsg && (
                <div className="p-3 rounded-xl text-sm text-center"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  {bookMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT SUMMARY ── */}
      {showPayment && selectedDoctor && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4 flex items-center gap-3" style={{ background: '#EBF0FF' }}>
            <button onClick={() => setShowPayment(false)}><X size={20} style={{ color: '#3B5BDB' }} /></button>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Confirm Appointment</h2>
          </div>
          <PaymentSummary
            doctor={selectedDoctor}
            date={date}
            reason={reason}
            loading={false}
            error={bookMsg}
            onBack={() => setShowPayment(false)}
            onConfirm={async () => {
              setBookMsg('')
              try {
                await bookAppointment({ doctorId: selectedDoctor._id, date, reason })
                setShowPayment(false)
                setShowBooking(false)
                setDate('')
                setReason('')
                setTab('appointments')
                getPatientAppointments().then(setAppointments)
              } catch (err: any) { setBookMsg(err.message) }
            }}
          />
        </div>
      )}

      {/* ── MESSAGES TAB: chat list ── */}
      {tab === 'messages' && !chatAppt && (
        <div className="pb-24">
          <div className="px-6 pt-12 pb-4" style={{ background: '#EBF0FF' }}>
            <h2 className="text-xl font-bold" style={{ color: '#1B1B2F' }}>Messages</h2>
          </div>
          <div className="px-6 mt-4 space-y-3">
            {appointments.filter(a => ['confirmed', 'completed'].includes(a.status)).length === 0 && (
              <p className="text-sm text-center py-12" style={{ color: '#9CA3AF' }}>
                No active appointments to chat about yet.
              </p>
            )}
            {appointments
              .filter(a => ['confirmed', 'completed'].includes(a.status))
              .map(a => {
                const doctorName = typeof a.doctor === 'object' ? a.doctor.name : 'Doctor'
                return (
                  <button key={a._id} onClick={() => setChatAppt(a)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                      style={{ background: '#3B5BDB' }}>
                      {doctorName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>Dr. {doctorName}</p>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>{a.reason}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: a.status === 'confirmed' ? '#D1FAE5' : '#DBEAFE', color: a.status === 'confirmed' ? '#065F46' : '#1E40AF' }}>
                      {a.status}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* ── CHAT VIEW ── */}
      {tab === 'messages' && chatAppt && (
        <ChatScreen
          appointmentId={chatAppt._id}
          appointmentLabel={`Dr. ${typeof chatAppt.doctor === 'object' ? chatAppt.doctor.name : 'Doctor'}`}
          currentUserId={user?.id ?? ''}
          token={token ?? ''}
          onBack={() => setChatAppt(null)}
        />
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="px-6 pt-12 pb-24">
          <h2 className="text-xl font-bold mb-6" style={{ color: '#1B1B2F' }}>Profile</h2>
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
              style={{ background: '#3B5BDB' }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'P'}
            </div>
            <p className="font-semibold" style={{ color: '#1B1B2F' }}>{user?.name ?? 'Patient'}</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>{user?.email ?? ''}</p>
          </div>

          {ratingMsg && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ background: '#D1FAE5', color: '#065F46' }}>{ratingMsg}</div>
          )}

          {/* Medical History */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-4">
            <h3 className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>Medical History</h3>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>This information is shared with your doctor before consultations.</p>
            {medMsg && (
              <div className="p-3 rounded-xl text-sm"
                style={{ background: medMsg.includes('saved') ? '#D1FAE5' : '#FEE2E2', color: medMsg.includes('saved') ? '#065F46' : '#DC2626' }}>
                {medMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Blood Type</label>
              <select value={medForm.bloodType} onChange={e => setMedForm(f => ({ ...f, bloodType: e.target.value }))}
                className="input-field text-sm" style={{ paddingLeft: '1rem' }}>
                {['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            {[
              { key: 'allergies', label: 'Allergies', placeholder: 'e.g. Penicillin, Peanuts' },
              { key: 'chronicConditions', label: 'Chronic Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
              { key: 'currentMedications', label: 'Current Medications', placeholder: 'e.g. Metformin 500mg daily' },
              { key: 'emergencyContactName', label: 'Emergency Contact Name', placeholder: 'Full name' },
              { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', placeholder: '+265 xxx xxx xxx' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{label}</label>
                <input type="text" placeholder={placeholder}
                  value={(medForm as any)[key]}
                  onChange={e => setMedForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input-field text-sm" style={{ paddingLeft: '1rem' }} />
              </div>
            ))}
            <button onClick={handleSaveMedical} disabled={medLoading} className="btn-primary">
              {medLoading ? 'Saving…' : 'Save Medical Profile'}
            </button>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-4">
            <h3 className="font-semibold text-sm" style={{ color: '#1B1B2F' }}>Change Password</h3>
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

      <BottomNav
        active={tab === 'appointments' || showBooking ? 'appointments' : tab}
        onTab={(t) => { setShowBooking(false); setShowAI(false); setShowHealth(false); setTab(t) }}
        badges={{
          appointments: appointments.filter(a => a.status === 'pending').length,
          messages: appointments.filter(a => a.status === 'confirmed').length,
        }}
      />
    </div>
  )
}
