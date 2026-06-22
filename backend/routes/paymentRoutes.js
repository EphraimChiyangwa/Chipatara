const express = require('express')
const router = express.Router()
const https = require('https')
const Appointment = require('../models/Appointment')
const DoctorAvailability = require('../models/DoctorAvailability')
const Doctor = require('../models/Doctor')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')
const { sendEmail, emailTemplates } = require('../utils/emailService')

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

function paystackRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.paystack.co',
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }
    const req = https.request(options, res => {
      let raw = ''
      res.on('data', chunk => (raw += chunk))
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch { reject(new Error('Invalid Paystack response')) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const getDayName = d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()]
const getTimeString = d => { const dt = new Date(d); return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` }

// POST /api/payments/initialize — create Paystack transaction for a paid appointment
router.post('/initialize', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can pay.' })

    const { doctorId, date, reason } = req.body
    if (!doctorId || !date || !reason) return res.status(400).json({ message: 'doctorId, date, and reason are required.' })

    const appointmentDate = new Date(date)
    if (isNaN(appointmentDate) || appointmentDate < new Date()) {
      return res.status(400).json({ message: 'Invalid or past date.' })
    }

    // Check availability
    const dayName = getDayName(date)
    const appointmentTime = getTimeString(date)
    const slots = await DoctorAvailability.find({ doctor: doctorId, day: dayName })
    if (!slots.length) return res.status(400).json({ message: `Doctor not available on ${dayName}.` })

    const aptMins = toMinutes(appointmentTime)
    const withinSlot = slots.some(s => aptMins >= toMinutes(s.startTime) && aptMins < toMinutes(s.endTime))
    if (!withinSlot) return res.status(400).json({ message: `Time ${appointmentTime} is outside the doctor's hours on ${dayName}.` })

    // Check conflict
    const conflict = await Appointment.findOne({ doctor: doctorId, date: appointmentDate, status: { $in: ['pending','confirmed'] } })
    if (conflict) return res.status(409).json({ message: 'This time slot is already booked.' })

    // Get fee
    const doctorProfile = await Doctor.findOne({ user: doctorId })
    const fee = doctorProfile?.consultationFee ?? 0

    if (!fee || fee <= 0) {
      return res.status(400).json({ message: 'This is a free appointment — use the regular booking endpoint.' })
    }

    const patient = await User.findById(req.user.id)
    if (!patient) return res.status(404).json({ message: 'Patient not found.' })

    // Initialize Paystack transaction (amount in kobo/cents × 100)
    const paystackRes = await paystackRequest('POST', '/transaction/initialize', {
      email: patient.email,
      amount: Math.round(fee * 100), // Paystack uses lowest currency unit
      currency: 'USD',
      metadata: {
        doctorId,
        patientId: req.user.id,
        date: appointmentDate.toISOString(),
        reason,
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-callback`,
    })

    if (!paystackRes.status) {
      return res.status(500).json({ message: paystackRes.message || 'Failed to initialize payment.' })
    }

    res.json({
      authorization_url: paystackRes.data.authorization_url,
      reference: paystackRes.data.reference,
      access_code: paystackRes.data.access_code,
      fee,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/payments/verify — verify Paystack reference then book appointment
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can verify payment.' })

    const { reference, doctorId, date, reason } = req.body
    if (!reference || !doctorId || !date || !reason) {
      return res.status(400).json({ message: 'reference, doctorId, date, and reason are required.' })
    }

    // Verify with Paystack
    const verifyRes = await paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
    if (!verifyRes.status || verifyRes.data?.status !== 'success') {
      return res.status(400).json({ message: 'Payment was not successful. Please try again.' })
    }

    // Ensure this reference hasn't been used already
    const duplicate = await Appointment.findOne({ paystackReference: reference })
    if (duplicate) return res.status(409).json({ message: 'This payment reference has already been used.' })

    const appointmentDate = new Date(date)

    // Final conflict check
    const conflict = await Appointment.findOne({ doctor: doctorId, date: appointmentDate, status: { $in: ['pending','confirmed'] } })
    if (conflict) return res.status(409).json({ message: 'Slot was just booked by someone else.' })

    const appointment = new Appointment({
      patient: req.user.id,
      doctor: doctorId,
      date: appointmentDate,
      reason,
      status: 'pending',
      paystackReference: reference,
      paid: true,
    })
    await appointment.save()

    // Send confirmation emails
    const [patient, doctor] = await Promise.all([User.findById(req.user.id), User.findById(doctorId)])
    if (patient && doctor) {
      const { subject, html } = emailTemplates.appointmentBooked(patient.name, doctor.name, appointmentDate, reason)
      sendEmail({ to: patient.email, subject, html })
    }

    res.status(201).json({ message: 'Payment verified and appointment booked.', appointment })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
