'use strict'

const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const HealthJournal = require('../models/HealthJournal')
const Appointment = require('../models/Appointment')

// GET /api/journal — patient's own journal entries (newest first)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patients only.' })
    const entries = await HealthJournal.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    res.json(entries)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/journal — add a journal entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patients only.' })
    const { entry, tags } = req.body
    if (!entry?.trim()) return res.status(400).json({ message: 'entry is required.' })
    const doc = await HealthJournal.create({
      user: req.user.id,
      entry: entry.trim(),
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    })
    res.status(201).json(doc)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/journal/:id — delete own entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ message: 'Patients only.' })
    const doc = await HealthJournal.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!doc) return res.status(404).json({ message: 'Entry not found.' })
    res.json({ message: 'Entry deleted.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/journal/patient/:patientId — doctor reads a patient's journal
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctors only.' })
    const appt = await Appointment.findOne({
      doctor: req.user.id,
      patient: req.params.patientId,
      status: { $in: ['confirmed', 'completed'] },
    })
    if (!appt) return res.status(403).json({ message: 'No active appointment with this patient.' })
    const entries = await HealthJournal.find({ user: req.params.patientId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
    res.json(entries)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
