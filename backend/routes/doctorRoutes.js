const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// ✅ CREATE DOCTOR PROFILE (doctors only)
router.post("/profile", authMiddleware, roleMiddleware("doctor"), async (req, res) => {
  try {
    const { specialization, hospital, consultationFee, bio } = req.body;

    const existingProfile = await Doctor.findOne({ user: req.user.id });
    if (existingProfile) {
      return res.status(400).json({ message: "Doctor profile already exists" });
    }

    const newDoctor = new Doctor({
      user: req.user.id,
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


// ✅ UPDATE DOCTOR PROFILE
router.put("/profile", authMiddleware, roleMiddleware("doctor"), async (req, res) => {
  try {
    const { specialization, hospital, consultationFee, bio } = req.body;

    const profile = await Doctor.findOneAndUpdate(
      { user: req.user.id },
      { specialization, hospital, consultationFee: Number(consultationFee), bio },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found. Create it first." });
    }

    res.json({ message: "Profile updated successfully.", doctor: profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET ALL DOCTORS (supports ?search=name&specialization=Cardiology)
router.get("/", async (req, res) => {
  try {
    const { search, specialization } = req.query;

    const userQuery = { role: "doctor" };
    if (search) {
      userQuery.name = { $regex: search, $options: "i" };
    }

    const doctors = await User.find(userQuery).select("name email").lean();

    let doctorsWithProfile = await Promise.all(
      doctors.map(async (doc) => {
        const profile = await Doctor.findOne({ user: doc._id }).lean();
        return { ...doc, profile: profile || null };
      })
    );

    if (specialization) {
      doctorsWithProfile = doctorsWithProfile.filter(
        (d) => d.profile?.specialization?.toLowerCase().includes(specialization.toLowerCase())
      );
    }

    res.json(doctorsWithProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET UNIQUE SPECIALIZATIONS (for filter dropdown)
router.get("/specializations", async (req, res) => {
  try {
    const profiles = await Doctor.find({}).select("specialization").lean();
    const unique = [...new Set(profiles.map((p) => p.specialization).filter(Boolean))].sort();
    res.json(unique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;