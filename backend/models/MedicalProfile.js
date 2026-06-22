const mongoose = require('mongoose')

const medicalProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodType: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'], default: 'Unknown' },
  allergies: { type: String, default: '' },
  chronicConditions: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  emergencyContactName: { type: String, default: '' },
  emergencyContactPhone: { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('MedicalProfile', medicalProfileSchema)
