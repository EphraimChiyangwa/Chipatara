import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { ChevronRight, X, Clock, Search, Brain, Star, Video, Activity, Trash2, Copy, Check, Plus, ClipboardList, CalendarPlus, UserSearch, AlertCircle, Stethoscope, Zap, SlidersHorizontal, ChevronUp, ChevronDown, CheckCircle2, HeartPulse, Shield, MessageCircle, LogOut, Lock, KeyRound, Syringe, Phone, User as UserIcon, Watch } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getDoctors, getSpecializations, getAvailability,
  getPatientAppointments, cancelAppointment, checkSymptoms, type SymptomResult,
  rateAppointment, changePassword,
  registerDevice, getMyDevices, deleteDevice, getMyHealthMetrics, getDeviceToken,
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
  const [doctorsLoading, setDoctorsLoading] = useState(true)
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
  // Apple Watch setup
  const [watchSetupStep, setWatchSetupStep] = useState<0 | 1 | 2>(0)
  const [showWatchSetup, setShowWatchSetup] = useState(false)
  const [watchDevice, setWatchDevice] = useState<any>(null)
  const [revealedTokens, setRevealedTokens] = useState<Record<string, string>>({})
  const [copiedWatchToken, setCopiedWatchToken] = useState(false)

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

  // Booking success
  const [showSuccess, setShowSuccess] = useState(false)
  const [bookedInfo, setBookedInfo] = useState<{ doctorName: string; specialization: string; date: string; reason: string } | null>(null)

  // Tab direction for slide animations
  const TAB_ORDER: Tab[] = ['home', 'appointments', 'messages', 'profile']
  const tabDir = useRef<'right' | 'left'>('right')
  const changeTab = (t: Tab) => {
    const prevIdx = TAB_ORDER.indexOf(tab)
    const nextIdx = TAB_ORDER.indexOf(t)
    tabDir.current = nextIdx >= prevIdx ? 'right' : 'left'
    setShowBooking(false); setShowAI(false); setShowHealth(false); setTab(t)
  }

  useEffect(() => { getSpecializations().then(setSpecializations) }, [])
  useEffect(() => {
    setDoctorsLoading(true)
    getDoctors(
      search, specialization,
      minFee !== '' ? Number(minFee) : undefined,
      maxFee !== '' ? Number(maxFee) : undefined,
      minRating > 0 ? minRating : undefined
    ).then(d => { setDoctors(d); setDoctorsLoading(false) })
      .catch(() => setDoctorsLoading(false))
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
    if (watchDevice?._id === id) { setWatchDevice(null); setShowWatchSetup(false); setWatchSetupStep(0) }
  }

  const handleConnectAppleWatch = async () => {
    try {
      const res = await registerDevice({ name: 'Apple Watch', type: 'smartwatch' }) as any
      setWatchDevice(res.device)
      setDevices(prev => [res.device, ...prev])
      setWatchSetupStep(1)
    } catch { /* silently fail */ }
  }

  const handleRevealToken = async (deviceId: string) => {
    if (revealedTokens[deviceId]) return
    try {
      const res = await getDeviceToken(deviceId)
      setRevealedTokens(prev => ({ ...prev, [deviceId]: res.token }))
    } catch { /* silently fail */ }
  }

  const copyWatchToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedWatchToken(true)
    setTimeout(() => setCopiedWatchToken(false), 2000)
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    })
  }

  const doctorSearchRef = useRef<HTMLDivElement>(null)

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
        <div key="tab-home" className={`tab-scroll-content ${tabDir.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`}>
          {/* Hero Header */}
          <div className="header-gradient px-6 pt-14 pb-8">
            <div className="flex justify-between items-start mb-5" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}
                </p>
                <h2 className="text-[28px] font-extrabold text-white leading-tight tracking-tight">
                  {user?.name?.split(' ')[0] ?? 'Patient'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>How are you feeling today?</p>
              </div>
              {/* Avatar with outer ring */}
              <div className="flex-shrink-0 p-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.4)' }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-lg"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'P'}
                </div>
              </div>
            </div>
            {/* Quick stats row */}
            <div className="flex gap-2.5 mt-1" style={{ position: 'relative', zIndex: 1 }}>
              {[
                { label: 'Total visits', value: appointments.length },
                { label: 'Upcoming', value: appointments.filter(a => a.status === 'confirmed').length },
                { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length },
              ].map(s => (
                <div key={s.label} className="glass-chip flex-1 px-3 py-2.5 text-center">
                  <p className="text-xl font-extrabold text-white leading-none">{s.value}</p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.68)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions + feature banners */}
          <div className="px-5 mt-6">
            {/* Section label */}
            <p className="section-label">Quick Actions</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* New Health Concern card */}
              <button onClick={() => {
                  changeTab('home'); setShowBooking(false); setSelectedDoctor(null)
                  setTimeout(() => doctorSearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                }}
                className="card-bezel text-left transition-all"
                style={{ transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
                <div className="card p-4" style={{ border: 'none' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg, #FECDD3, #FCA5A5)' }}>
                    <Plus size={18} color="#DC2626" strokeWidth={2.5} />
                  </div>
                  <p className="font-bold text-sm leading-tight mb-1" style={{ color: '#0F1730' }}>New Health Concern</p>
                  <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Find a Doctor</p>
                </div>
              </button>
              {/* Existing condition card */}
              <button onClick={() => changeTab('appointments')}
                className="card-bezel text-left transition-all"
                style={{ transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
                <div className="card p-4" style={{ border: 'none' }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg, #A7F3D0, #6EE7B7)' }}>
                    <ClipboardList size={18} color="#059669" strokeWidth={2} />
                  </div>
                  <p className="font-bold text-sm leading-tight mb-1" style={{ color: '#0F1730' }}>Existing Condition</p>
                  <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>My Visits</p>
                </div>
              </button>
            </div>

            {/* Feature banners with double-bezel */}
            <div className="space-y-3 mb-6">
              {/* Health Monitoring Banner */}
              <div className="card-bezel">
                <button
                  onClick={handleOpenHealth}
                  className="card w-full flex items-center gap-3 p-4"
                  style={{ border: 'none', background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                    <Activity size={20} color="white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-white tracking-tight">Health Monitoring</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>Connect smartwatch, view live vitals</p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <ChevronRight size={14} color="white" />
                  </div>
                </button>
              </div>

              {/* AI Symptom Checker Banner */}
              <div className="card-bezel">
                <button
                  onClick={() => { setShowAI(true); setAiResult(null); setAiError(''); setAiSymptoms('') }}
                  className="card w-full flex items-center gap-3 p-4"
                  style={{ border: 'none', background: 'linear-gradient(135deg, #2A44C8 0%, #3B5BDB 100%)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                    <Brain size={20} color="white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm text-white tracking-tight">AI Symptom Checker</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>Describe symptoms, get instant guidance</p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <ChevronRight size={14} color="white" />
                  </div>
                </button>
              </div>
            </div>

            {/* Search + Filter */}
            <p className="section-label" ref={doctorSearchRef}>Find a Doctor</p>
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
                aria-label={showFilters ? 'Hide filters' : 'Show filters'}
                className="w-full text-sm font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2"
                style={{ background: showFilters ? '#3B5BDB' : '#EBF0FF', color: showFilters ? '#fff' : '#3B5BDB' }}>
                <SlidersHorizontal size={14} />
                {showFilters ? 'Hide Filters' : 'More Filters'}
                {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                          aria-label={r === 0 ? 'Any rating' : `Minimum ${r} stars`}
                          aria-pressed={minRating === r}
                          className="inline-btn flex-1 text-xs font-medium py-1.5 rounded-xl transition-all"
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
              {doctorsLoading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="doctor-skeleton" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="skeleton rounded-[18px] flex-shrink-0" style={{ width: 56, height: 56 }} />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 rounded-lg" style={{ width: '55%' }} />
                    <div className="skeleton h-2.5 rounded-lg" style={{ width: '75%' }} />
                    <div className="skeleton h-2.5 rounded-lg" style={{ width: '40%' }} />
                  </div>
                  <div className="skeleton rounded-full flex-shrink-0" style={{ width: 32, height: 32 }} />
                </div>
              ))}
              {!doctorsLoading && doctors.map((doc, i) => {
                const avatarColors = ['#3B5BDB','#7C3AED','#0891B2','#059669','#DC2626','#D97706']
                const avatarBg = avatarColors[doc.name.charCodeAt(0) % avatarColors.length]
                const rating = (doc as any).averageRating ?? 0
                const reviewCount = (doc as any).reviewCount ?? 0
                const staggerClass = `stagger-${Math.min(i + 1, 6)}`
                return (
                  <button key={doc._id} onClick={() => selectDoctor(doc)}
                    aria-label={`Book appointment with Dr. ${doc.name}`}
                    className={`w-full doctor-card flex items-center gap-3 text-left fade-up ${staggerClass}`}>
                    {/* Avatar with outer bezel */}
                    <div className="relative flex-shrink-0">
                      <div className="p-0.5 rounded-[18px]"
                        style={{ background: `linear-gradient(135deg, ${avatarBg}30, ${avatarBg}15)`, border: `1px solid ${avatarBg}20` }}>
                        <div className="w-13 h-13 rounded-[15px] flex items-center justify-center font-extrabold text-white text-lg"
                          style={{ background: `linear-gradient(135deg, ${avatarBg} 0%, ${avatarBg}cc 100%)`, width: 52, height: 52,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)` }}>
                          {doc.name.charAt(0)}
                        </div>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                        style={{ background: '#10B981' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm tracking-tight" style={{ color: '#0F1730' }}>Dr. {doc.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#6B7280' }}>
                        {doc.profile?.specialization ?? 'General Practitioner'}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{doc.profile?.hospital ?? ''}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {doc.profile?.consultationFee ? (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                            ${doc.profile.consultationFee}
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: '#DCFCE7', color: '#059669' }}>Free</span>
                        )}
                        {rating > 0 && (
                          <span className="text-xs flex items-center gap-0.5 font-medium" style={{ color: '#F59E0B' }}>
                            <Star size={10} fill="#F59E0B" />
                            <span style={{ color: '#374151' }}>{rating.toFixed(1)}</span>
                            <span style={{ color: '#9CA3AF' }}>({reviewCount})</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #EBF0FF, #dde4ff)', boxShadow: '0 1px 4px rgba(59,91,219,0.15)' }}>
                      <ChevronRight size={14} style={{ color: '#3B5BDB' }} />
                    </div>
                  </button>
                )
              })}
              {!doctorsLoading && doctors.length === 0 && (
                <div className="empty-state fade-up">
                  <div className="empty-state-icon">
                    <UserSearch size={32} style={{ color: '#3B5BDB' }} strokeWidth={1.5} />
                  </div>
                  <p className="empty-state-title">No doctors found</p>
                  <p className="empty-state-desc">Try adjusting your search or filters to find a specialist</p>
                  <button
                    onClick={() => { setSearch(''); setMinFee(''); setMaxFee(''); setMinRating(0) }}
                    className="inline-btn mt-1 text-sm font-semibold px-4 py-2 rounded-full"
                    style={{ background: '#EBF0FF', color: '#3B5BDB' }}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HEALTH MONITORING ── */}
      {showHealth && (
        <div className="tab-scroll-content" style={{ overflowY: 'auto', height: '100dvh', overscrollBehaviorY: 'contain' }}>
          <div className="px-6 pt-12 pb-6"
            style={{ background: 'linear-gradient(150deg, #065F46 0%, #059669 55%, #34D399 100%)', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />
            <div className="flex items-center justify-between mb-4" style={{ position: 'relative', zIndex: 1 }}>
              <button
                aria-label="Close health monitoring"
                onClick={() => setShowHealth(false)}
                className="inline-btn w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <X size={16} color="white" />
              </button>
              <div className="flex items-center gap-2">
                {liveConnected ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full live-pulse"
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#fff' }} />
                    LIVE
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
                    Connecting…
                  </span>
                )}
                <button
                  aria-label="Refresh health data"
                  onClick={loadHealthData}
                  className="inline-btn text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Refresh
                </button>
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>Vitals Dashboard</p>
              <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight">Health Monitoring</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Your real-time health metrics</p>
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
                <p className="font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color: '#065F46' }}>
                  <Check size={14} strokeWidth={2.5} /> Device Registered!
                </p>
                <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
                  Token saved. Use it to configure your device.
                </p>
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
              </div>
            )}

            {/* ── Apple Watch Connect Banner ── */}
            {!showWatchSetup && !devices.some(d => d.name === 'Apple Watch') && (
              <div className="mb-5 rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <Watch size={20} color="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white leading-tight">Connect Apple Watch</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Auto-sync heart rate, SpO2 & steps via iOS Shortcuts</p>
                  </div>
                  <button
                    onClick={() => { setShowWatchSetup(true); setWatchSetupStep(0) }}
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Setup
                  </button>
                </div>
              </div>
            )}

            {/* ── Apple Watch Setup Wizard ── */}
            {showWatchSetup && (
              <div className="mb-5">
                {/* Step 0: Intro */}
                {watchSetupStep === 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#1C1C1E' }}>
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Watch size={16} color="white" />
                        <p className="font-bold text-sm text-white">Apple Watch Setup</p>
                      </div>
                      <button onClick={() => setShowWatchSetup(false)} className="inline-btn p-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <X size={14} color="rgba(255,255,255,0.6)" />
                      </button>
                    </div>
                    <div className="px-4 pb-5 space-y-3">
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Your Apple Watch syncs health data to Chipatara using an iOS Shortcut that runs automatically in the background.
                      </p>
                      <div className="space-y-2">
                        {[
                          { icon: '1', label: 'Register your Watch', desc: 'Creates a secure device token' },
                          { icon: '2', label: 'Add an iOS Shortcut', desc: 'Reads heart rate, SpO2 & steps from Health' },
                          { icon: '3', label: 'Set it to run hourly', desc: 'Data syncs while you wear your Watch' },
                        ].map(s => (
                          <div key={s.icon} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                              style={{ background: '#3B5BDB' }}>{s.icon}</div>
                            <div>
                              <p className="text-xs font-semibold text-white">{s.label}</p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleConnectAppleWatch}
                        className="w-full py-3 rounded-xl font-bold text-sm text-white"
                        style={{ background: '#3B5BDB' }}>
                        Register My Apple Watch
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: Token */}
                {watchSetupStep === 1 && watchDevice && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#1C1C1E' }}>
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} color="#34D399" />
                        <p className="font-bold text-sm text-white">Watch Registered</p>
                      </div>
                      <button onClick={() => setShowWatchSetup(false)} className="inline-btn p-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <X size={14} color="rgba(255,255,255,0.6)" />
                      </button>
                    </div>
                    <div className="px-4 pb-5 space-y-3">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Copy this token — you'll paste it into the iOS Shortcut in the next step.
                      </p>
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Device Token</p>
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <code className="flex-1 text-xs break-all" style={{ color: '#A5F3FC', fontFamily: 'monospace' }}>
                            {watchDevice.token}
                          </code>
                          <button onClick={() => copyWatchToken(watchDevice.token)}
                            className="flex-shrink-0 p-2 rounded-lg"
                            style={{ background: copiedWatchToken ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)' }}>
                            {copiedWatchToken
                              ? <Check size={14} color="#34D399" />
                              : <Copy size={14} color="rgba(255,255,255,0.6)" />}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => setWatchSetupStep(2)}
                        className="w-full py-3 rounded-xl font-bold text-sm text-white"
                        style={{ background: '#3B5BDB' }}>
                        Next: Set Up Shortcut
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Shortcut guide */}
                {watchSetupStep === 2 && watchDevice && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: '#1C1C1E' }}>
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Watch size={16} color="white" />
                        <p className="font-bold text-sm text-white">iOS Shortcut Setup</p>
                      </div>
                      <button onClick={() => setShowWatchSetup(false)} className="inline-btn p-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <X size={14} color="rgba(255,255,255,0.6)" />
                      </button>
                    </div>
                    <div className="px-4 pb-5 space-y-2">
                      <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Open the <strong style={{ color: 'white' }}>Shortcuts</strong> app on your iPhone and create a new Shortcut with these actions in order:
                      </p>

                      {[
                        {
                          step: '1',
                          title: 'Get Health Samples — Heart Rate',
                          detail: 'Search "Get Health Samples" → Type: Heart Rate → Period: Last Hour → Aggregate: Latest Sample',
                        },
                        {
                          step: '2',
                          title: 'Get Health Samples — Blood Oxygen',
                          detail: 'Add another "Get Health Samples" → Type: Blood Oxygen → Period: Last Hour → Aggregate: Latest Sample',
                        },
                        {
                          step: '3',
                          title: 'Get Health Samples — Steps',
                          detail: 'Add another "Get Health Samples" → Type: Step Count → Period: Last 24 Hours → Aggregate: Sum',
                        },
                        {
                          step: '4',
                          title: 'Dictionary (build JSON body)',
                          detail: 'Add "Dictionary" action with keys: heartRate → Heart Rate Samples Value, spO2 → Blood Oxygen Samples Value, steps → Step Count Samples Value',
                        },
                        {
                          step: '5',
                          title: 'Get Contents of URL',
                          detail: `URL: http://localhost:5000/api/devices/ingest\nMethod: POST\nRequest Body: JSON → use the Dictionary from step 4\nHeaders: X-Device-Token → paste your token`,
                        },
                        {
                          step: '6',
                          title: 'Automate it',
                          detail: 'Go to Automation tab → New Automation → Time of Day → set to run every 1 hour → select this Shortcut → turn off "Ask Before Running"',
                        },
                      ].map(s => (
                        <div key={s.step} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: '#3B5BDB', fontSize: '10px' }}>{s.step}</span>
                            <p className="text-xs font-semibold text-white">{s.title}</p>
                          </div>
                          <p className="text-xs leading-relaxed pl-7 whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.detail}</p>
                        </div>
                      ))}

                      <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(59,91,219,0.2)', border: '1px solid rgba(59,91,219,0.4)' }}>
                        <p className="text-xs font-semibold text-white mb-1">Your token (copy again if needed)</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs break-all" style={{ color: '#A5F3FC', fontFamily: 'monospace' }}>
                            {watchDevice.token}
                          </code>
                          <button onClick={() => copyWatchToken(watchDevice.token)}
                            className="flex-shrink-0 p-1.5 rounded-lg"
                            style={{ background: copiedWatchToken ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)' }}>
                            {copiedWatchToken
                              ? <Check size={12} color="#34D399" />
                              : <Copy size={12} color="rgba(255,255,255,0.6)" />}
                          </button>
                        </div>
                      </div>

                      <button onClick={() => { setShowWatchSetup(false); setWatchSetupStep(0) }}
                        className="w-full py-3 rounded-xl font-bold text-sm mt-2"
                        style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                        Done — I've set up the Shortcut
                      </button>
                    </div>
                  </div>
                )}
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
                    placeholder="Device name (e.g. My Fitness Band)"
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

              {devices.length === 0 && !showAddDevice && !showWatchSetup && (
                <div className="text-center py-6 rounded-2xl" style={{ background: '#F8F9FE' }}>
                  <Activity size={28} style={{ color: '#D1FAE5', margin: '0 auto 8px' }} />
                  <p className="text-sm font-medium" style={{ color: '#1B1B2F' }}>No devices connected</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Connect your Apple Watch or add a device above</p>
                </div>
              )}

              <div className="space-y-2">
                {devices.map(d => (
                  <div key={d._id} className="bg-white rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: d.name === 'Apple Watch' ? '#1C1C1E' : (d.active ? '#D1FAE5' : '#F3F4F6') }}>
                        {d.name === 'Apple Watch'
                          ? <Watch size={17} color="white" />
                          : <Activity size={18} style={{ color: d.active ? '#059669' : '#9CA3AF' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1B1B2F' }}>{d.name}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                          {d.type.replace('_', ' ')} · {d.lastSeen ? `Last synced ${new Date(d.lastSeen).toLocaleDateString()}` : 'Never synced'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {d.name === 'Apple Watch' && (
                          <button
                            onClick={() => { handleRevealToken(d._id); setWatchDevice(d); setShowWatchSetup(true); setWatchSetupStep(revealedTokens[d._id] ? 2 : 1) }}
                            className="inline-btn p-2 rounded-xl"
                            style={{ background: '#F8F9FE' }}
                            aria-label="View Shortcut setup">
                            <ChevronRight size={14} style={{ color: '#6B7280' }} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteDevice(d._id)} className="p-2 rounded-xl"
                          style={{ background: '#FEE2E2' }}>
                          <Trash2 size={14} style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI SYMPTOM CHECKER ── */}
      {showAI && (
        <div className="tab-scroll-content" style={{ overflowY: 'auto', height: '100dvh', overscrollBehaviorY: 'contain' }}>
          {/* Gradient header */}
          <div className="header-gradient px-6 pt-12 pb-6">
            <div className="flex items-center justify-between mb-4" style={{ position: 'relative', zIndex: 1 }}>
              <button
                aria-label="Close AI symptom checker"
                onClick={() => setShowAI(false)}
                className="inline-btn w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <X size={16} color="white" />
              </button>
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Zap size={18} color="white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em', position: 'relative', zIndex: 1 }}>Powered by AI</p>
            <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight"
              style={{ position: 'relative', zIndex: 1 }}>Symptom Checker</h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)', position: 'relative', zIndex: 1 }}>
              Describe your symptoms and get guidance
            </p>
          </div>

          <div className="px-6 mt-6">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1B1B2F' }}>
                What are you experiencing?
              </label>
              <textarea
                value={aiSymptoms}
                onChange={e => setAiSymptoms(e.target.value)}
                rows={4}
                placeholder="e.g. I have had a persistent headache for 3 days, fever of 38°C, and a sore throat…"
                className="input-field resize-none w-full"
                style={{ paddingLeft: '1rem', paddingTop: '0.75rem', lineHeight: '1.6' }}
              />
            </div>

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
      {tab === 'appointments' && !showBooking && !showSuccess && (
        <div key="tab-appointments" className={`tab-scroll-content ${tabDir.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`}>
          <div className="header-gradient px-6 pt-14 pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em', position: 'relative', zIndex: 1 }}>
              Chipatara
            </p>
            <h2 className="text-[26px] font-extrabold text-white tracking-tight leading-tight"
              style={{ position: 'relative', zIndex: 1 }}>My Visits</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)', position: 'relative', zIndex: 1 }}>
              Track and manage your consultations
            </p>
          </div>
          <div className="px-5 mt-4">
            {apptMsg && (
              <div className="mb-3 p-3 rounded-2xl text-sm font-medium" style={{ background: '#EBF0FF', color: '#3B5BDB' }}>{apptMsg}</div>
            )}
            {appointments.length === 0
              ? (
                <div className="empty-state fade-up">
                  <div className="empty-state-icon">
                    <CalendarPlus size={32} style={{ color: '#3B5BDB' }} strokeWidth={1.5} />
                  </div>
                  <p className="empty-state-title">No visits yet</p>
                  <p className="empty-state-desc">Book a consultation with a doctor to get started on your health journey</p>
                  <button
                    onClick={() => changeTab('home')}
                    className="mt-1 text-sm font-semibold px-5 py-2.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #3B5BDB, #4F6FF5)', color: '#fff',
                      boxShadow: '0 4px 16px rgba(59,91,219,0.35)' }}>
                    Find a Doctor
                  </button>
                </div>
              )
              : appointments.map(a => {
                  const sc = statusColor(a.status)
                  const statusBorder: Record<string, string> = {
                    pending: '#F59E0B', confirmed: '#10B981', completed: '#3B5BDB', cancelled: '#EF4444'
                  }
                  const apptDate = new Date(a.date)
                  return (
                    <div key={a._id} className="appt-card-enter mb-3 overflow-hidden"
                      style={{
                        animationDelay: `${(appointments.indexOf(a)) * 50}ms`,
                        background: '#fff',
                        borderRadius: 20,
                        boxShadow: '0 2px 16px rgba(15,23,48,0.07), 0 0 0 1px rgba(59,91,219,0.05)',
                        borderLeft: `3px solid ${statusBorder[a.status] ?? '#E5E7EB'}`,
                      }}>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm flex-1 mr-2" style={{ color: '#1B1B2F' }}>{a.reason}</p>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0"
                            style={{ background: sc.bg, color: sc.text }}>{a.status}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: '#3B5BDB' }}>
                            {(typeof a.doctor === 'object' ? a.doctor.name : '?').charAt(0)}
                          </div>
                          <p className="text-xs font-semibold" style={{ color: '#3B5BDB' }}>
                            Dr. {typeof a.doctor === 'object' ? a.doctor.name : a.doctor}
                          </p>
                        </div>
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

                        {/* Status timeline — only for non-cancelled */}
                        {a.status !== 'cancelled' && (() => {
                          const steps = [
                            { key: 'pending',   label: 'Booked' },
                            { key: 'confirmed', label: 'Confirmed' },
                            { key: 'completed', label: 'Done' },
                          ]
                          const activeIdx = steps.findIndex(s => s.key === a.status)
                          return (
                            <div className="flex items-center gap-0 mb-3">
                              {steps.map((step, idx) => {
                                const done = idx < activeIdx
                                const active = idx === activeIdx
                                return (
                                  <div key={step.key} className="flex items-center" style={{ flex: idx < steps.length - 1 ? '1 1 0' : 'none' }}>
                                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                                        style={{
                                          background: done ? '#3B5BDB' : active ? '#EBF0FF' : '#F3F4F6',
                                          border: active ? '2px solid #3B5BDB' : done ? 'none' : '2px solid #E5E7EB',
                                          boxShadow: active ? '0 0 0 3px rgba(59,91,219,0.15)' : 'none',
                                        }}>
                                        {done ? <Check size={10} color="white" strokeWidth={3} /> :
                                         active ? <div className="w-2 h-2 rounded-full" style={{ background: '#3B5BDB' }} /> : null}
                                      </div>
                                      <span className="text-[9px] font-semibold whitespace-nowrap"
                                        style={{ color: active ? '#3B5BDB' : done ? '#6B7280' : '#C4C9D4', letterSpacing: '0.02em' }}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                      <div className="step-line mx-0.5 mb-3"
                                        style={{ background: done || active ? '#3B5BDB' : '#E5E7EB', opacity: done ? 1 : active ? 0.4 : 0.3 }} />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}

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
                          className="inline-btn text-xs font-medium px-3 py-1.5 rounded-xl mb-2 flex items-center gap-1.5"
                          style={{ background: '#FEF3C7', color: '#92400E' }}>
                          <Stethoscope size={12} /> View Prescription
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
                                    className="inline-btn text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1"
                                    style={{ background: '#FDE68A', color: '#92400E' }}>
                                    <Copy size={11} /> Print
                                  </button>
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
                    </div>
                  )
                })}
          </div>
        </div>
      )}

      {/* ── BOOKING SHEET ── */}
      {showBooking && !showPayment && selectedDoctor && (
        <div className="tab-scroll-content">
          {/* Gradient header */}
          <div className="header-gradient px-6 pt-12 pb-6">
            <button
              aria-label="Go back"
              onClick={() => setShowBooking(false)}
              className="inline-btn w-8 h-8 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <X size={16} color="white" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>Book Consultation</p>
            <h2 className="text-[24px] font-extrabold text-white tracking-tight leading-tight">
              Dr. {selectedDoctor.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {selectedDoctor.profile?.specialization ?? 'General Practitioner'}
              {selectedDoctor.profile?.hospital ? ` · ${selectedDoctor.profile.hospital}` : ''}
            </p>
          </div>
          <div className="px-6 mt-4">

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
        <div className="tab-scroll-content">
          <div className="header-gradient px-6 pt-12 pb-5 flex items-center gap-3">
            <button
              aria-label="Go back"
              onClick={() => setShowPayment(false)}
              className="inline-btn w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <X size={16} color="white" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.6)' }}>Review & Pay</p>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Confirm Appointment</h2>
            </div>
          </div>
          <PaymentSummary
            doctor={selectedDoctor}
            date={date}
            reason={reason}
            onBack={() => setShowPayment(false)}
            onSuccess={() => {
              setShowPayment(false)
              setShowBooking(false)
              setBookedInfo({
                doctorName: selectedDoctor.name,
                specialization: selectedDoctor.profile?.specialization ?? 'General Practitioner',
                date,
                reason,
              })
              setDate('')
              setReason('')
              setShowSuccess(true)
              getPatientAppointments().then(setAppointments)
            }}
          />
        </div>
      )}

      {/* ── BOOKING SUCCESS ── */}
      {showSuccess && bookedInfo && (
        <div className="tab-scroll-content flex flex-col" style={{ minHeight: '100dvh' }}>
          {/* Top gradient */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            {/* Animated check ring */}
            <div className="relative mb-6 success-ring">
              <div className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', border: '3px solid #4ADE80' }}>
                <div className="check-pop">
                  <CheckCircle2 size={52} color="#16A34A" strokeWidth={1.5} />
                </div>
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(74,222,128,0.3)', transform: 'scale(1.18)', animation: 'pulse-ring 2s infinite' }} />
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#16A34A', letterSpacing: '0.14em' }}>
              Booking Confirmed
            </p>
            <h2 className="text-[28px] font-extrabold tracking-tight leading-tight mb-2" style={{ color: '#0F1730' }}>
              You're all set!
            </h2>
            <p className="text-sm" style={{ color: '#6B7280', maxWidth: 260, lineHeight: 1.6 }}>
              Your appointment with Dr. {bookedInfo.doctorName} has been booked successfully.
            </p>

            {/* Appointment summary card */}
            <div className="w-full mt-8 card-bezel text-left">
              <div className="card p-4 space-y-3" style={{ border: 'none' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center font-extrabold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3B5BDB, #4F6FF5)', boxShadow: '0 2px 8px rgba(59,91,219,0.3)' }}>
                    {bookedInfo.doctorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#0F1730' }}>Dr. {bookedInfo.doctorName}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>{bookedInfo.specialization}</p>
                  </div>
                </div>
                <div className="h-px" style={{ background: 'rgba(59,91,219,0.08)' }} />
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: '#9CA3AF' }} />
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>
                    {new Date(bookedInfo.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Stethoscope size={14} style={{ color: '#9CA3AF', marginTop: 1 }} />
                  <span className="text-xs" style={{ color: '#374151' }}>{bookedInfo.reason}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-28 space-y-3">
            <button
              onClick={() => { setShowSuccess(false); changeTab('appointments') }}
              className="btn-primary">
              View My Appointments
            </button>
            <button
              onClick={() => { setShowSuccess(false); changeTab('home') }}
              className="btn-outline">
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── MESSAGES TAB: chat list ── */}
      {tab === 'messages' && !chatAppt && (
        <div key="tab-messages" className={`tab-scroll-content ${tabDir.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`}>
          <div className="header-gradient px-6 pt-14 pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em', position: 'relative', zIndex: 1 }}>
              Care Team
            </p>
            <h2 className="text-[26px] font-extrabold text-white tracking-tight"
              style={{ position: 'relative', zIndex: 1 }}>Messages</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)', position: 'relative', zIndex: 1 }}>
              Chat with your doctors
            </p>
          </div>
          <div className="px-5 mt-4 space-y-2.5">
            {appointments.filter(a => ['confirmed', 'completed'].includes(a.status)).length === 0 ? (
              <div className="empty-state fade-up">
                <div className="empty-state-icon">
                  <MessageCircle size={32} style={{ color: '#3B5BDB' }} strokeWidth={1.5} />
                </div>
                <p className="empty-state-title">No conversations yet</p>
                <p className="empty-state-desc">Chat becomes available once a doctor confirms your appointment</p>
                <button
                  onClick={() => changeTab('home')}
                  className="mt-1 text-sm font-semibold px-5 py-2.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #3B5BDB, #4F6FF5)', color: '#fff', boxShadow: '0 4px 16px rgba(59,91,219,0.35)' }}>
                  Book a Consultation
                </button>
              </div>
            ) : appointments
              .filter(a => ['confirmed', 'completed'].includes(a.status))
              .map((a, i) => {
                const doctorName = typeof a.doctor === 'object' ? a.doctor.name : 'Doctor'
                const isActive = a.status === 'confirmed'
                const apptDate = new Date(a.date)
                const now = new Date()
                const diffMs = now.getTime() - apptDate.getTime()
                const diffDays = Math.floor(diffMs / 86400000)
                const timeLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : apptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const avatarColors = ['#3B5BDB','#7C3AED','#0891B2','#059669','#D97706']
                const avatarBg = avatarColors[doctorName.charCodeAt(0) % avatarColors.length]
                return (
                  <button key={a._id} onClick={() => setChatAppt(a)}
                    aria-label={`Chat with Dr. ${doctorName}`}
                    className={`w-full doctor-card flex items-center gap-3 text-left fade-up stagger-${Math.min(i + 1, 6)}`}
                    style={{ paddingLeft: '0.875rem', paddingRight: '0.875rem' }}>
                    {/* Avatar with online dot */}
                    <div className="relative flex-shrink-0">
                      <div className="p-0.5 rounded-[16px]"
                        style={{ background: `linear-gradient(135deg, ${avatarBg}25, ${avatarBg}12)`, border: `1px solid ${avatarBg}20` }}>
                        <div className="w-12 h-12 rounded-[13px] flex items-center justify-center font-extrabold text-white"
                          style={{ background: `linear-gradient(135deg, ${avatarBg}, ${avatarBg}cc)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                          {doctorName.charAt(0)}
                        </div>
                      </div>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                          style={{ background: '#10B981' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-sm" style={{ color: '#0F1730' }}>Dr. {doctorName}</p>
                        <span className="text-[10px] font-medium flex-shrink-0" style={{ color: '#9CA3AF' }}>{timeLabel}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                        {isActive ? 'Tap to start your consultation chat' : a.reason}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: isActive ? '#D1FAE5' : '#DBEAFE', color: isActive ? '#065F46' : '#1E40AF' }}>
                          {isActive ? 'Active' : 'Completed'}
                        </span>
                      </div>
                    </div>

                    {isActive && <div className="unread-dot flex-shrink-0" />}
                    {!isActive && (
                      <ChevronRight size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    )}
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
        <div key="tab-profile" className={`tab-scroll-content ${tabDir.current === 'right' ? 'tab-enter-right' : 'tab-enter-left'}`}>
          {/* Profile Hero */}
          <div className="header-gradient px-6 pt-14 pb-6">
            <div className="flex items-center gap-4 mb-6" style={{ position: 'relative', zIndex: 1 }}>
              {/* Avatar double-bezel */}
              <div className="p-1 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white"
                  style={{ background: 'rgba(255,255,255,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'P'}
                </div>
              </div>
              <div>
                <p className="font-extrabold text-[20px] text-white tracking-tight leading-tight">{user?.name ?? 'Patient'}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.62)' }}>{user?.email ?? ''}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}>
                  <UserIcon size={9} /> Patient
                </span>
              </div>
            </div>

            {/* Stats row */}
            {(() => {
              const total = appointments.length
              const completed = appointments.filter(a => a.status === 'completed').length
              const upcoming = appointments.filter(a => ['pending','confirmed'].includes(a.status)).length
              return (
                <div className="grid grid-cols-3 gap-2" style={{ position: 'relative', zIndex: 1 }}>
                  {[
                    { label: 'Total Visits', value: total },
                    { label: 'Completed', value: completed },
                    { label: 'Upcoming', value: upcoming },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass-chip px-3 py-2.5 text-center">
                      <p className="text-xl font-extrabold text-white leading-none">{value}</p>
                      <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          <div className="px-5 mt-5">
            {ratingMsg && (
              <div className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ background: '#D1FAE5', color: '#065F46' }}>{ratingMsg}</div>
            )}

            {/* Medical profile completion */}
            {(() => {
              const fields = [
                medForm.bloodType !== 'Unknown',
                !!medForm.allergies,
                !!medForm.chronicConditions,
                !!medForm.currentMedications,
                !!medForm.emergencyContactName,
                !!medForm.emergencyContactPhone,
              ]
              const filled = fields.filter(Boolean).length
              const pct = Math.round((filled / fields.length) * 100)
              return pct < 100 ? (
                <div className="card-bezel mb-5">
                  <div className="card p-4" style={{ border: 'none' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                          style={{ background: '#EBF0FF' }}>
                          <Shield size={14} style={{ color: '#3B5BDB' }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: '#0F1730' }}>Medical Profile</p>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#3B5BDB' }}>{pct}% complete</span>
                    </div>
                    <div className="completion-bar-track">
                      <div className="completion-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                      Complete your profile to help doctors prepare for your visits
                    </p>
                  </div>
                </div>
              ) : null
            })()}

            {/* Medical History */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: '#EBF0FF' }}>
                  <HeartPulse size={16} style={{ color: '#3B5BDB' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0F1730' }}>Medical History</p>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Shared with your doctor before visits</p>
                </div>
              </div>
              <div className="card p-4 space-y-3" style={{ border: 'none' }}>
                {medMsg && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: medMsg.includes('saved') ? '#D1FAE5' : '#FEE2E2', color: medMsg.includes('saved') ? '#065F46' : '#DC2626' }}>
                    {medMsg}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Blood Type</label>
                  <select value={medForm.bloodType} onChange={e => setMedForm(f => ({ ...f, bloodType: e.target.value }))}
                    className="input-field text-sm" style={{ paddingLeft: '1rem' }}>
                    {['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                {[
                  { key: 'allergies', label: 'Allergies', placeholder: 'e.g. Penicillin, Peanuts', icon: <AlertCircle size={14} /> },
                  { key: 'chronicConditions', label: 'Chronic Conditions', placeholder: 'e.g. Diabetes, Hypertension', icon: <HeartPulse size={14} /> },
                  { key: 'currentMedications', label: 'Current Medications', placeholder: 'e.g. Metformin 500mg daily', icon: <Syringe size={14} /> },
                  { key: 'emergencyContactName', label: 'Emergency Contact', placeholder: 'Full name', icon: <Phone size={14} /> },
                  { key: 'emergencyContactPhone', label: 'Emergency Phone', placeholder: '+265 xxx xxx xxx', icon: <Phone size={14} /> },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>{label}</label>
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
            </div>

            {/* Change password */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: '#F3E8FF' }}>
                  <KeyRound size={16} style={{ color: '#7C3AED' }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0F1730' }}>Security</p>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Update your password</p>
                </div>
              </div>
              <div className="card p-4 space-y-3" style={{ border: 'none' }}>
                {pwMsg && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: pwMsg.includes('success') ? '#D1FAE5' : '#FEE2E2', color: pwMsg.includes('success') ? '#065F46' : '#DC2626' }}>
                    {pwMsg}
                  </div>
                )}
                {[
                  { key: 'current', label: 'Current password', placeholder: 'Enter current password' },
                  { key: 'next',    label: 'New password', placeholder: 'Enter new password' },
                  { key: 'confirm', label: 'Confirm new password', placeholder: 'Re-enter new password' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>{label}</label>
                    <input type="password" placeholder={placeholder}
                      value={(pwForm as any)[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      className="input-field" style={{ paddingLeft: '1rem' }} />
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={pwLoading} className="btn-primary">
                  {pwLoading ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FECACA' }}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      <BottomNav
        active={tab === 'appointments' || showBooking || showSuccess ? 'appointments' : tab}
        onTab={changeTab}
        badges={{
          appointments: appointments.filter(a => a.status === 'pending').length,
          messages: appointments.filter(a => a.status === 'confirmed').length,
        }}
      />
    </div>
  )
}
