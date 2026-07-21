'use strict'
const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true },
  docType:  { type: String, enum: ['lab_result', 'xray', 'prescription', 'other'], default: 'other' },
  mimeType: { type: String, required: true },
  sizeKb:   { type: Number },
  data:     { type: String, required: true }, // base64
}, { timestamps: true })

module.exports = mongoose.model('Document', documentSchema)
