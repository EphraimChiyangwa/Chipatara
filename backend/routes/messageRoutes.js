'use strict'

const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const Message = require('../models/Message')
const Appointment = require('../models/Appointment')

// GET /api/messages/:appointmentId — load chat history
router.get('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.appointmentId)
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' })

    const uid = req.user.id
    const isParticipant =
      appt.patient.toString() === uid || appt.doctor.toString() === uid
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized.' })

    const messages = await Message.find({ appointment: req.params.appointmentId })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 })

    res.json(messages)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
