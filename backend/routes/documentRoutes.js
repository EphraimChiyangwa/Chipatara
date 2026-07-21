'use strict'
const express = require('express')
const router  = express.Router()
const Document = require('../models/Document')
const Appointment = require('../models/Appointment')
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

// POST /api/documents — upload a document (patient)
router.post('/', authMiddleware, roleMiddleware('patient'), async (req, res) => {
  try {
    const { name, docType, mimeType, sizeKb, data } = req.body
    if (!name || !mimeType || !data) return res.status(400).json({ message: 'name, mimeType and data are required' })
    const doc = await Document.create({ user: req.user.id, name, docType: docType || 'other', mimeType, sizeKb, data })
    res.status(201).json({ document: { _id: doc._id, name: doc.name, docType: doc.docType, mimeType: doc.mimeType, sizeKb: doc.sizeKb, createdAt: doc.createdAt } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/documents — list own documents without base64 payload
router.get('/', authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user.id })
      .select('-data')
      .sort({ createdAt: -1 })
      .lean()
    res.json(docs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/documents/:id/download — fetch full base64 (owner or doctor with appointment)
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean()
    if (!doc) return res.status(404).json({ message: 'Document not found' })

    const isOwner = doc.user.toString() === req.user.id
    if (!isOwner) {
      const appt = await Appointment.findOne({
        doctor: req.user.id,
        patient: doc.user,
        status: { $in: ['confirmed', 'completed'] },
      })
      if (!appt) return res.status(403).json({ message: 'Access denied' })
    }
    res.json(doc)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/documents/patient/:patientId — doctor lists a patient's documents
router.get('/patient/:patientId', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
  try {
    const appt = await Appointment.findOne({
      doctor: req.user.id,
      patient: req.params.patientId,
      status: { $in: ['confirmed', 'completed'] },
    })
    if (!appt) return res.status(403).json({ message: 'No active appointment with this patient' })

    const docs = await Document.find({ user: req.params.patientId })
      .select('-data')
      .sort({ createdAt: -1 })
      .lean()
    res.json(docs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/documents/:id — owner only
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!doc) return res.status(404).json({ message: 'Document not found' })
    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
