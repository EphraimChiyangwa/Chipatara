const mongoose = require('mongoose')

const healthMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  heartRate: { type: Number, min: 0, max: 300 },    // bpm
  spO2: { type: Number, min: 0, max: 100 },          // %
  steps: { type: Number, min: 0 },
  temperature: { type: Number, min: 30, max: 45 },   // °C
  systolic: { type: Number, min: 0, max: 300 },      // mmHg
  diastolic: { type: Number, min: 0, max: 200 },     // mmHg
  sleepHours: { type: Number, min: 0, max: 24 },
  timestamp: { type: Date, default: Date.now },
})

module.exports = mongoose.model('HealthMetric', healthMetricSchema)
