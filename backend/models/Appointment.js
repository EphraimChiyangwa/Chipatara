const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  reason: {
    type: String,
    required: true
  },

  status: {
    type: String,
    default: "pending"
  },

  notes: {
    type: String,
    default: ""
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },

  review: {
    type: String,
    default: ""
  },

  reminderSent: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);