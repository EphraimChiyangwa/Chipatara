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
    const appointments = await Appointment.find({
      patient: req.user.id
    });

    res.json(appointments);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get appointments for doctor
router.get("/doctor", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user.id
    });

    res.json(appointments);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update appointment status (doctors only)
router.put("/:id/status", authMiddleware, updateAppointmentStatus);

module.exports = router;