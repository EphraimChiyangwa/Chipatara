const mongoose = require('mongoose')

const healthJournalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entry: { type: String, required: true, maxlength: 2000 },
  tags:  { type: [String], default: [] },
}, { timestamps: true })

healthJournalSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('HealthJournal', healthJournalSchema)
