const BASE = 'http://localhost:5000/api'

async function aiRequest<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/ai${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'AI service error')
  return data as T
}

export type SymptomResult = {
  conditions: { name: string; likelihood: 'high' | 'medium' | 'low'; description: string }[]
  recommendedSpecialists: string[]
  urgency: 'low' | 'medium' | 'high' | 'emergency'
  advice: string
  disclaimer: string
}

// Messages
export const getAppointmentMessages = (appointmentId: string) =>
  request<any[]>(`/messages/${appointmentId}`, { headers: headers(true) })

// Devices & Health Metrics
export const registerDevice = (body: { name: string; type: string }) =>
  request<any>('/devices', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

export const getMyDevices = () =>
  request<any[]>('/devices', { headers: headers(true) })

export const deleteDevice = (id: string) =>
  request(`/devices/${id}`, { method: 'DELETE', headers: headers(true) })

export const getDeviceToken = (id: string) =>
  request<{ token: string }>(`/devices/${id}/token`, { headers: headers(true) })

export const getMyHealthMetrics = () =>
  request<any[]>('/devices/metrics', { headers: headers(true) })

export const getPatientHealthMetrics = (patientId: string) =>
  request<any[]>(`/devices/metrics/${patientId}`, { headers: headers(true) })

// Medical profile
export const getMyMedicalProfile = () =>
  request<any | null>('/medical-profile', { headers: headers(true) })

export const saveMedicalProfile = (body: object) =>
  request('/medical-profile', { method: 'PUT', headers: headers(true), body: JSON.stringify(body) })

export const getPatientMedicalProfile = (patientId: string) =>
  request<any | null>(`/medical-profile/${patientId}`, { headers: headers(true) })

// Payments
export const initializePayment = (body: object) =>
  request<{ authorization_url: string; reference: string; access_code: string; fee: number }>(
    '/payments/initialize', { method: 'POST', headers: headers(true), body: JSON.stringify(body) }
  )

export const verifyPayment = (body: object) =>
  request<any>('/payments/verify', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

// Prescriptions
export const savePrescription = (body: object) =>
  request('/prescriptions', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

export const getAppointmentPrescription = (appointmentId: string) =>
  request<any | null>(`/prescriptions/appointment/${appointmentId}`, { headers: headers(true) })

export const getMyPrescriptions = () =>
  request<any[]>('/prescriptions/my', { headers: headers(true) })

// AI Service
export const checkSymptoms = (symptoms: string, patientHistory?: string) =>
  aiRequest<SymptomResult>('/symptoms', { symptoms, patientHistory })

export const recommendDoctor = (symptoms: string) =>
  aiRequest<{ specialization: string; reason: string }>('/recommend-doctor', { symptoms })

function getToken() {
  return localStorage.getItem('token')
}

function headers(auth = false): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) h['Authorization'] = `Bearer ${getToken()}`
  return h
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data as T
}

// Auth
export const register = (body: { name: string; email: string; password: string; role: string }) =>
  request('/auth/register', { method: 'POST', headers: headers(), body: JSON.stringify(body) })

export const login = (body: { email: string; password: string }) =>
  request<{ token: string; message: string }>('/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify(body) })

export const getProfile = () =>
  request<{ user: { id: string; role: string; name: string; email: string } }>('/auth/profile', { headers: headers(true) })

export const changePassword = (currentPassword: string, newPassword: string) =>
  request('/auth/change-password', { method: 'PUT', headers: headers(true), body: JSON.stringify({ currentPassword, newPassword }) })

export const forgotPassword = (email: string) =>
  request('/auth/forgot-password', { method: 'POST', headers: headers(), body: JSON.stringify({ email }) })

export const resetPassword = (token: string, password: string) =>
  request('/auth/reset-password', { method: 'POST', headers: headers(), body: JSON.stringify({ token, password }) })

// Doctors
export const getDoctors = (search = '', specialization = '', minFee?: number, maxFee?: number, minRating?: number) => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (specialization) params.set('specialization', specialization)
  if (minFee !== undefined) params.set('minFee', String(minFee))
  if (maxFee !== undefined) params.set('maxFee', String(maxFee))
  if (minRating !== undefined && minRating > 0) params.set('minRating', String(minRating))
  const qs = params.toString()
  return request<any[]>(`/doctors${qs ? `?${qs}` : ''}`)
}

export const getSpecializations = () =>
  request<string[]>('/doctors/specializations')

export const getMyDoctorProfile = () =>
  request<any | null>('/doctors/me', { headers: headers(true) })

export const createDoctorProfile = (body: object) =>
  request('/doctors/profile', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

export const updateDoctorProfile = (body: object) =>
  request('/doctors/profile', { method: 'PUT', headers: headers(true), body: JSON.stringify(body) })

// Availability
export const getAvailability = (doctorId: string) =>
  request<any[]>(`/availability/${doctorId}`)

export const addAvailability = (body: object) =>
  request('/availability', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

export const updateAvailability = (id: string, body: object) =>
  request(`/availability/${id}`, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) })

export const deleteAvailability = (id: string) =>
  request(`/availability/${id}`, { method: 'DELETE', headers: headers(true) })

// Appointments
export const bookAppointment = (body: object) =>
  request('/appointments', { method: 'POST', headers: headers(true), body: JSON.stringify(body) })

export const getPatientAppointments = () =>
  request<any[]>('/appointments/patient', { headers: headers(true) })

export const getDoctorAppointments = () =>
  request<any[]>('/appointments/doctor', { headers: headers(true) })

export const updateAppointmentStatus = (id: string, status: string) =>
  request(`/appointments/${id}/status`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ status }) })

export const cancelAppointment = (id: string) =>
  request(`/appointments/${id}/cancel`, { method: 'PUT', headers: headers(true) })

export const rescheduleAppointment = (id: string, date: string) =>
  request(`/appointments/${id}/reschedule`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ date }) })

export const saveConsultationNotes = (id: string, notes: string) =>
  request(`/appointments/${id}/notes`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ notes }) })

export const rateAppointment = (id: string, rating: number, review?: string) =>
  request(`/appointments/${id}/rating`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ rating, review }) })

// Admin
export const adminGetUsers = () =>
  request<any[]>('/admin/users', { headers: headers(true) })

export const adminGetDoctors = () =>
  request<any[]>('/admin/doctors', { headers: headers(true) })

export const adminVerifyDoctor = (id: string) =>
  request(`/admin/doctors/${id}/verify`, { method: 'PUT', headers: headers(true) })

export const adminRejectDoctor = (id: string) =>
  request(`/admin/doctors/${id}/reject`, { method: 'PUT', headers: headers(true) })

export const adminDeleteUser = (id: string) =>
  request(`/admin/users/${id}`, { method: 'DELETE', headers: headers(true) })

export const adminGetAppointments = () =>
  request<any[]>('/admin/appointments', { headers: headers(true) })

export const adminUpdateAppointmentStatus = (id: string, status: string) =>
  request(`/admin/appointments/${id}/status`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ status }) })
