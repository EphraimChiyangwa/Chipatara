const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const authMiddleware = require("../middleware/authMiddleware");


// Book appointment
router.post("/", authMiddleware, async (req, res) => {

  try {

    const { doctor, date, reason } = req.body;

    const appointment = new Appointment({
      patient: req.user.id,
      doctor,
      date,
      reason
    });

    await appointment.save();

    res.status(201).json({
      message: "Appointment booked",
      appointment
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Server error" });

  }

});


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


// Update appointment status
router.put("/:id/status", authMiddleware, async (req, res) => {

  try {

    const { status } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = status;

    await appointment.save();

    res.json({
      message: "Appointment status updated",
      appointment
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Server error" });

  }

});

module.exports = router;