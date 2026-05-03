const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Doctor = require("../models/Doctor");


// ✅ CREATE DOCTOR PROFILE
router.post("/profile", async (req, res) => {
  try {
    const { userId, specialization, hospital, consultationFee, bio } = req.body;

    // 1. Check if userId is provided
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // 2. Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Ensure user is a doctor
    if (user.role !== "doctor") {
      return res.status(400).json({ message: "User is not a doctor" });
    }

    // 4. Check if profile already exists
    const existingProfile = await Doctor.findOne({ user: userId });
    if (existingProfile) {
      return res.status(400).json({ message: "Doctor profile already exists" });
    }

    // 5. Create profile
    const newDoctor = new Doctor({
      user: userId,
      specialization,
      hospital,
      consultationFee,
      bio,
    });

    await newDoctor.save();

    res.status(201).json({
      message: "Doctor profile created successfully",
      doctor: newDoctor,
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// ✅ GET ALL DOCTORS
router.get("/", async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("name email")
      .lean();

    const doctorsWithProfile = await Promise.all(
      doctors.map(async (doc) => {
        const profile = await Doctor.findOne({ user: doc._id });

        return {
          ...doc,
          profile: profile || null,
        };
      })
    );

    res.json(doctorsWithProfile);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;