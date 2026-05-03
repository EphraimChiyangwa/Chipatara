const express = require("express");
const router = express.Router();
const DoctorAvailability = require("../models/DoctorAvailability");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {

  try {

    const { day, startTime, endTime } = req.body;

    const availability = new DoctorAvailability({
      doctor: req.user.id,
      day,
      startTime,
      endTime
    });

    await availability.save();

    res.status(201).json({
      message: "Availability added",
      availability
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Server error" });

  }

});

module.exports = router;