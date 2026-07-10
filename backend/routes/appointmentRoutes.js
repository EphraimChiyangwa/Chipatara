const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { bookAppointment, updateAppointmentStatus } = require("../controllers/appointmentController");
const Appointment = require("../models/Appointment");

// Book appointment (patients only) - now checks doctor availability
router.post("/", authMiddleware, bookAppointment);

// Get appointments for logged-in patient
router.get("/patient", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate("doctor", "name email")
      .populate("patient", "name email")
      .sort({ date: -1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get appointments for doctor
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate("doctor", "name email")
      .populate("patient", "name email")
      .sort({ date: -1 });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update appointment status (doctors only)
router.put("/:id/status", authMiddleware, updateAppointmentStatus);

// Cancel appointment (patient who owns it, only if pending or confirmed)
router.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can cancel appointments." });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to cancel this appointment." });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot cancel an appointment that is already ${appointment.status}.` });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.json({ message: "Appointment cancelled successfully.", appointment });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add/update consultation notes (doctor only)
router.put("/:id/notes", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can add notes." });
    }
    const { notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }
    appointment.notes = notes || "";
    await appointment.save();
    res.json({ message: "Notes saved.", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rate a completed appointment (patient only)
router.put("/:id/rating", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can rate appointments." });
    }
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (appointment.status !== "completed") {
      return res.status(400).json({ message: "Can only rate completed appointments." });
    }
    appointment.rating = rating;
    appointment.review = review || "";
    await appointment.save();
    res.json({ message: "Rating saved.", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /:id/reschedule — patient reschedules a pending or confirmed appointment
router.put("/:id/reschedule", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can reschedule appointments." });
    }
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: "New date is required." });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to reschedule this appointment." });
    }
    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({ message: `Cannot reschedule a ${appointment.status} appointment.` });
    }

    appointment.date = new Date(date);
    appointment.status = "pending"; // reset to pending so doctor re-confirms
    await appointment.save();

    res.json({ message: "Appointment rescheduled. Awaiting doctor confirmation.", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /:id — fetch a single appointment (patient or doctor who owns it)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate("doctor", "name email")
      .populate("patient", "name email")
      .lean();
    if (!appt) return res.status(404).json({ message: "Appointment not found." });
    const uid = req.user.id;
    if (appt.patient._id.toString() !== uid && appt.doctor._id.toString() !== uid) {
      return res.status(403).json({ message: "Not authorized." });
    }
    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;