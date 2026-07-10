'use strict'

const Appointment = require('../models/Appointment')
const User = require('../models/User')
const { sendPushNotification } = require('./fcmService')

// Checks every 5 minutes for confirmed appointments happening in ~1 hour.
// Sends an FCM push notification to both patient and doctor.
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
        date: { $gte: in55min, $lte: in65min },
      })
        .populate('patient', 'name fcmToken')
        .populate('doctor', 'name fcmToken')
        .lean()

      for (const appt of upcoming) {
        const timeStr = new Date(appt.date).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit',
        })

        const promises = []

        if (appt.patient?.fcmToken) {
          promises.push(
            sendPushNotification(
              appt.patient.fcmToken,
              'Appointment in 1 hour',
              `Your consultation with Dr. ${appt.doctor?.name ?? 'your doctor'} starts at ${timeStr}`,
              { type: 'appointment', appointmentId: appt._id.toString() }
            ).catch(() => {})
          )
        }

        if (appt.doctor?.fcmToken) {
          promises.push(
            sendPushNotification(
              appt.doctor.fcmToken,
              'Appointment in 1 hour',
              `You have a consultation with ${appt.patient?.name ?? 'a patient'} at ${timeStr}`,
              { type: 'appointment', appointmentId: appt._id.toString() }
            ).catch(() => {})
          )
        }

        await Promise.all(promises)
        await Appointment.findByIdAndUpdate(appt._id, { reminderSent: true })
      }

      if (upcoming.length > 0) {
        console.log(`[reminders] Sent push reminders for ${upcoming.length} appointment(s)`)
      }
    } catch (err) {
      console.error('[reminders] Error:', err.message)
    }
  }

  setInterval(check, INTERVAL)
  check() // run once immediately on startup
  console.log('Appointment reminder service started (checks every 5 min)')
}

module.exports = { startReminderService }
