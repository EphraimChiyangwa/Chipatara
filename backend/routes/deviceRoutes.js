const express = require('express')
const router = express.Router()
const Device = require('../models/Device')
const HealthMetric = require('../models/HealthMetric')
const Appointment = require('../models/Appointment')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')
const { sendEmail } = require('../utils/emailService')

const THRESHOLDS = {
  heartRate: { low: 40, high: 120, label: 'Heart Rate', unit: 'bpm' },
  spO2: { low: 94, label: 'Blood Oxygen', unit: '%' },
  temperature: { high: 38.5, label: 'Temperature', unit: '°C' },
  systolic: { high: 140, label: 'Systolic BP', unit: 'mmHg' },
}

async function checkAndAlert(metric, userId) {
  const alerts = []
  if (metric.heartRate != null && (metric.heartRate > THRESHOLDS.heartRate.high || metric.heartRate < THRESHOLDS.heartRate.low))
    alerts.push(`Heart Rate: <strong>${metric.heartRate} bpm</strong> (normal: 40–120)`)
  if (metric.spO2 != null && metric.spO2 < THRESHOLDS.spO2.low)
    alerts.push(`Blood Oxygen: <strong>${metric.spO2}%</strong> (normal: ≥94%)`)
  if (metric.temperature != null && metric.temperature > THRESHOLDS.temperature.high)
    alerts.push(`Temperature: <strong>${metric.temperature}°C</strong> (normal: ≤38.5°C)`)
  if (metric.systolic != null && metric.systolic > THRESHOLDS.systolic.high)
    alerts.push(`Blood Pressure: <strong>${metric.systolic}/${metric.diastolic ?? '?'} mmHg</strong> (normal: ≤140 systolic)`)

  if (alerts.length === 0) return

  const user = await User.findById(userId).select('name email').lean()
  if (!user?.email) return

  await sendEmail({
    to: user.email,
    subject: '⚠️ Abnormal Health Reading – Chipatara',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#DC2626">⚠️ Abnormal Reading Detected</h2>
        <p>Hi <strong>${user.name}</strong>,</p>
        <p>Your health device reported the following abnormal reading(s):</p>
        <ul style="background:#FEE2E2;padding:16px 16px 16px 28px;border-radius:8px;color:#991B1B">
          ${alerts.map(a => `<li style="margin-bottom:6px">${a}</li>`).join('')}
        </ul>
        <p>Please consult your doctor if you feel unwell or these readings persist.</p>
        <p style="color:#9CA3AF;font-size:12px">Chipatara Telemedicine</p>
      </div>
    `,
  })
}

// POST /api/devices — register a device (patient only)
router.post('/', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { name, type } = req.body
    if (!name) return res.status(400).json({ message: 'Device name is required' })
    const device = new Device({ user: req.user.id, name, type: type || 'smartwatch' })
    await device.save()
    res.status(201).json({ device })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/devices/:id/token — retrieve device token (owner only)
router.get('/:id/token', authMiddleware, async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, user: req.user.id })
    if (!device) return res.status(404).json({ message: 'Device not found' })
    res.json({ token: device.token })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/devices — list own devices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const devices = await Device.find({ user: req.user.id }).sort({ createdAt: -1 })
    res.json(devices)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/devices/:id — remove a device
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!device) return res.status(404).json({ message: 'Device not found' })
    res.json({ message: 'Device removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/devices/ingest — push health data (authenticated with X-Device-Token header, no JWT)
router.post('/ingest', async (req, res) => {
  try {
    const token = req.headers['x-device-token']
    if (!token) return res.status(401).json({ message: 'X-Device-Token header required' })

    const device = await Device.findOne({ token, active: true })
    if (!device) return res.status(401).json({ message: 'Invalid or inactive device token' })

    const { heartRate, spO2, steps, temperature, systolic, diastolic, sleepHours } = req.body

    const metricData = { user: device.user, device: device._id }
    if (heartRate != null) metricData.heartRate = heartRate
    if (spO2 != null) metricData.spO2 = spO2
    if (steps != null) metricData.steps = steps
    if (temperature != null) metricData.temperature = temperature
    if (systolic != null) metricData.systolic = systolic
    if (diastolic != null) metricData.diastolic = diastolic
    if (sleepHours != null) metricData.sleepHours = sleepHours

    const metric = new HealthMetric(metricData)
    await metric.save()

    device.lastSeen = new Date()
    await device.save()

    // Real-time push to patient's health room
    if (req.io) {
      req.io.to(`health-${device.user}`).emit('health-update', metric)
    }

    // Async alert — don't block the response
    checkAndAlert(metric, device.user).catch(() => {})

    res.json({ message: 'Data received', timestamp: metric.timestamp })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/devices/metrics — own health metrics (patient)
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await HealthMetric.find({ user: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('device', 'name type')
      .lean()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/devices/health-connect/sync — sync Health Connect data (JWT auth, no device token needed)
router.post('/health-connect/sync', authMiddleware, async (req, res) => {
  try {
    const { heartRate, spO2, steps, temperature, systolic, diastolic, sleepHours } = req.body

    // Find or create a virtual Health Connect device for this user
    let device = await Device.findOne({ user: req.user.id, type: 'health_connect' })
    if (!device) {
      device = new Device({ user: req.user.id, name: 'Health Connect', type: 'health_connect' })
      await device.save()
    }
    device.lastSeen = new Date()
    await device.save()

    const metricData = { user: req.user.id, device: device._id }
    if (heartRate != null) metricData.heartRate = heartRate
    if (spO2 != null) metricData.spO2 = spO2
    if (steps != null) metricData.steps = steps
    if (temperature != null) metricData.temperature = temperature
    if (systolic != null) metricData.systolic = systolic
    if (diastolic != null) metricData.diastolic = diastolic
    if (sleepHours != null) metricData.sleepHours = sleepHours

    const metric = new HealthMetric(metricData)
    await metric.save()

    if (req.io) req.io.to(`health-${req.user.id}`).emit('health-update', metric)
    checkAndAlert(metric, req.user.id).catch(() => {})

    res.json({ message: 'Health data synced', metric })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/devices/fcm-token — store FCM push token for the logged-in user
router.post('/fcm-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ message: 'token is required' })
    await User.findByIdAndUpdate(req.user.id, { fcmToken: token })
    res.json({ message: 'FCM token saved' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/devices/metrics/:patientId — patient metrics (doctor must have an appointment)
router.get('/metrics/:patientId', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const appt = await Appointment.findOne({
      doctor: req.user.id,
      patient: req.params.patientId,
      status: { $in: ['confirmed', 'completed'] },
    })
    if (!appt) return res.status(403).json({ message: 'No active appointment found with this patient' })

    const metrics = await HealthMetric.find({ user: req.params.patientId })
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('device', 'name type')
      .lean()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
