'use strict'

const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  }
}, { timestamps: true })

module.exports = mongoose.model('Message', messageSchema)
