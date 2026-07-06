'use strict'

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const connectDB = require('./config/db')
const { startReminderService } = require('./utils/reminderService')
const Message = require('./models/Message')
const Appointment = require('./models/Appointment')
const User = require('./models/User')
const { sendPushNotification } = require('./utils/fcmService')

dotenv.config()
connectDB()
startReminderService()

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => res.send('Chipatara Telemedicine API Running'))

const authRoutes        = require('./routes/authRoutes')
const appointmentRoutes = require('./routes/appointmentRoutes')
const availabilityRoutes = require('./routes/availabilityRoutes')
const doctorRoutes      = require('./routes/doctorRoutes')
const adminRoutes       = require('./routes/adminRoutes')
const messageRoutes     = require('./routes/messageRoutes')
const deviceRoutes         = require('./routes/deviceRoutes')
const medicalProfileRoutes  = require('./routes/medicalProfileRoutes')
const prescriptionRoutes    = require('./routes/prescriptionRoutes')
const paymentRoutes         = require('./routes/paymentRoutes')
const { checkSymptoms, recommendDoctor } = require('./utils/symptomChecker')

// Attach socket.io instance to every request for routes that need real-time push
app.use((req, _res, next) => { req.io = io; next() })

app.use('/api/auth',         authRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/doctors',      doctorRoutes)
app.use('/api/admin',        adminRoutes)
app.use('/api/messages',     messageRoutes)
app.use('/api/devices',         deviceRoutes)
app.use('/api/medical-profile',  medicalProfileRoutes)
app.use('/api/prescriptions',    prescriptionRoutes)
app.use('/api/payments',         paymentRoutes)

// Rule-based AI symptom checker (no external API needed)
app.post('/api/ai/symptoms', (req, res) => {
  const { symptoms, patientHistory } = req.body
  if (!symptoms?.trim()) return res.status(400).json({ message: 'symptoms is required' })
  try {
    res.json(checkSymptoms(symptoms, patientHistory))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.post('/api/ai/recommend-doctor', (req, res) => {
  const { symptoms } = req.body
  if (!symptoms?.trim()) return res.status(400).json({ message: 'symptoms is required' })
  try {
    res.json(recommendDoctor(symptoms))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Socket.io chat ──────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication required'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  // Join a room identified by appointmentId
  socket.on('join', async (appointmentId) => {
    try {
      const appt = await Appointment.findById(appointmentId)
      if (!appt) return
      const uid = socket.user.id
      const allowed = appt.patient.toString() === uid || appt.doctor.toString() === uid
      if (!allowed) return
      socket.join(appointmentId)
    } catch { /* ignore */ }
  })

  // Patient joins their own health room
  socket.on('join-health', () => {
    socket.join(`health-${socket.user.id}`)
  })

  // Doctor joins a patient's health room (only if they have an appointment)
  socket.on('join-health-patient', async (patientId) => {
    try {
      const appt = await Appointment.findOne({
        doctor: socket.user.id,
        patient: patientId,
        status: { $in: ['confirmed', 'completed'] }
      })
      if (appt) socket.join(`health-${patientId}`)
    } catch { /* ignore */ }
  })

  socket.on('message', async ({ appointmentId, text }) => {
    if (!text?.trim() || !appointmentId) return
    try {
      const appt = await Appointment.findById(appointmentId)
      if (!appt) return
      const uid = socket.user.id
      const allowed = appt.patient.toString() === uid || appt.doctor.toString() === uid
      if (!allowed) return

      const msg = await Message.create({
        appointment: appointmentId,
        sender: uid,
        text: text.trim().slice(0, 1000)
      })
      await msg.populate('sender', 'name role')

      io.to(appointmentId).emit('message', msg)

      // Push notification to the other participant
      const recipientId = appt.patient.toString() === uid ? appt.doctor : appt.patient
      User.findById(recipientId).select('fcmToken').lean().then((recipient) => {
        if (recipient?.fcmToken) {
          const senderName = msg.sender?.name ?? 'New message'
          sendPushNotification(recipient.fcmToken, senderName, text.trim().slice(0, 100))
        }
      }).catch(() => {})
    } catch { /* ignore */ }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
