'use strict'

const Appointment = require('../models/Appointment')
const { sendEmail, emailTemplates } = require('./emailService')

// Checks every 5 minutes for confirmed appointments happening in ~1 hour
// and sends a reminder email if one hasn't been sent yet.
function startReminderService() {
  const INTERVAL = 5 * 60 * 1000 // 5 minutes

  const check = async () => {
    try {
      const now = new Date()
      const in55min = new Date(now.getTime() + 55 * 60 * 1000)
      const in65min = new Date(now.getTime() + 65 * 60 * 1000)

      const upcoming = await Appointment.find({
        status: 'confirmed',
        reminderSent: false,
        date: { $gte: in55min, $lte: in65min }
      })
        .populate('patient', 'name email')
        .populate('doctor', 'name')

      for (const appt of upcoming) {
        if (!appt.patient?.email) continue
        const { subject, html } = emailTemplates.appointmentReminder(
          appt.patient.name,
          appt.doctor.name,
          appt.date
        )
        await sendEmail({ to: appt.patient.email, subject, html })
        appt.reminderSent = true
        await appt.save()
      }

      if (upcoming.length > 0) {
        console.log(`[reminders] Sent ${upcoming.length} reminder(s)`)
      }
    } catch (err) {
      console.error('[reminders] Error:', err.message)
    }
  }

  setInterval(check, INTERVAL)
  console.log('Appointment reminder service started (checks every 5 min)')
}

module.exports = { startReminderService }
