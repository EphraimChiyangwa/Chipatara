const BASE = 'http://localhost:5000/api'
const AI_BASE = 'http://localhost:5001/api/ai'

async function aiRequest<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
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
export const getDoctors = (search = '', specialization = '') => {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (specialization) params.set('specialization', specialization)
  const qs = params.toString()
  return request<any[]>(`/doctors${qs ? `?${qs}` : ''}`)
}

export const getSpecializations = () =>
  request<string[]>('/doctors/specializations')

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

export const saveConsultationNotes = (id: string, notes: string) =>
  request(`/appointments/${id}/notes`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ notes }) })

export const rateAppointment = (id: string, rating: number, review?: string) =>
  request(`/appointments/${id}/rating`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ rating, review }) })

// Admin
export const adminGetUsers = () =>
  request<any[]>('/admin/users', { headers: headers(true) })

export const adminDeleteUser = (id: string) =>
  request(`/admin/users/${id}`, { method: 'DELETE', headers: headers(true) })

export const adminGetAppointments = () =>
  request<any[]>('/admin/appointments', { headers: headers(true) })

export const adminUpdateAppointmentStatus = (id: string, status: string) =>
  request(`/admin/appointments/${id}/status`, { method: 'PUT', headers: headers(true), body: JSON.stringify({ status }) })
