const express = require('express')
const router = express.Router()
const MedicalProfile = require('../models/MedicalProfile')
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

// GET /api/medical-profile — own profile (patient)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await MedicalProfile.findOne({ user: req.user.id }).lean()
    res.json(profile || null)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/medical-profile — create or update own profile (patient)
router.put('/', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { bloodType, allergies, chronicConditions, currentMedications, emergencyContactName, emergencyContactPhone } = req.body
    const profile = await MedicalProfile.findOneAndUpdate(
      { user: req.user.id },
      { bloodType, allergies, chronicConditions, currentMedications, emergencyContactName, emergencyContactPhone },
      { new: true, upsert: true }
    )
    res.json({ message: 'Medical profile saved.', profile })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/medical-profile/:patientId — doctor reads a patient's profile (must have appointment)
router.get('/:patientId', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const Appointment = require('../models/Appointment')
    const appt = await Appointment.findOne({
      doctor: req.user.id,
      patient: req.params.patientId,
      status: { $in: ['pending', 'confirmed', 'completed'] },
    })
    if (!appt) return res.status(403).json({ message: 'No appointment found with this patient' })

    const profile = await MedicalProfile.findOne({ user: req.params.patientId }).lean()
    res.json(profile || null)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
