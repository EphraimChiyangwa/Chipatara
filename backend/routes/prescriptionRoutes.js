const express = require('express')
const router = express.Router()
const Prescription = require('../models/Prescription')
const Appointment = require('../models/Appointment')
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

// POST /api/prescriptions — doctor creates/updates prescription for a completed appointment
router.post('/', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const { appointmentId, medications, notes } = req.body
    if (!appointmentId || !medications?.length) {
      return res.status(400).json({ message: 'Appointment and at least one medication are required' })
    }

    const appt = await Appointment.findById(appointmentId)
    if (!appt) return res.status(404).json({ message: 'Appointment not found' })
    if (appt.doctor.toString() !== req.user.id) return res.status(403).json({ message: 'Not your appointment' })
    if (appt.status !== 'completed') return res.status(400).json({ message: 'Can only prescribe for completed appointments' })

    const prescription = await Prescription.findOneAndUpdate(
      { appointment: appointmentId },
      { appointment: appointmentId, doctor: req.user.id, patient: appt.patient, medications, notes: notes || '' },
      { new: true, upsert: true }
    )

    res.status(201).json({ message: 'Prescription saved.', prescription })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/prescriptions/appointment/:appointmentId — get prescription for an appointment
router.get('/appointment/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.appointmentId)
    if (!appt) return res.status(404).json({ message: 'Appointment not found' })

    const uid = req.user.id
    const allowed = appt.patient.toString() === uid || appt.doctor.toString() === uid
    if (!allowed) return res.status(403).json({ message: 'Access denied' })

    const prescription = await Prescription.findOne({ appointment: req.params.appointmentId })
      .populate('doctor', 'name email')
      .populate('patient', 'name email')
      .lean()

    res.json(prescription || null)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/prescriptions/my — patient gets all their prescriptions
router.get('/my', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user.id })
      .populate('doctor', 'name')
      .populate('appointment', 'date reason')
      .sort({ createdAt: -1 })
      .lean()
    res.json(prescriptions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
