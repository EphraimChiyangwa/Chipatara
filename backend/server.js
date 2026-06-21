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

app.use('/api/auth',         authRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/doctors',      doctorRoutes)
app.use('/api/admin',        adminRoutes)
app.use('/api/messages',     messageRoutes)

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
    } catch { /* ignore */ }
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
