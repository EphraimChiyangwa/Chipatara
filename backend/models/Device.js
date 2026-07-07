const mongoose = require('mongoose')
const crypto = require('crypto')

const deviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['smartwatch', 'fitness_band', 'custom', 'health_connect'], default: 'smartwatch' },
  token: { type: String, unique: true },
  active: { type: Boolean, default: true },
  lastSeen: { type: Date, default: null },
}, { timestamps: true })

deviceSchema.pre('save', function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(24).toString('hex')
  }
  next()
})

module.exports = mongoose.model('Device', deviceSchema)
