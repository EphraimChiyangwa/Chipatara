const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const authMiddleware  = require("../middleware/authMiddleware");
const roleMiddleware  = require("../middleware/roleMiddleware");
const Appointment     = require("../models/Appointment");


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
      verified: true,
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
    const { specialization, hospital, consultationFee, bio, licenseNumber, yearsOfExperience } = req.body;

    const profile = await Doctor.findOneAndUpdate(
      { user: req.user.id },
      { specialization, hospital, consultationFee: Number(consultationFee), bio, licenseNumber, yearsOfExperience: Number(yearsOfExperience) || 0 },
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

// ✅ GET OWN PROFILE (logged-in doctor — bypasses verified filter)
router.get("/me", authMiddleware, roleMiddleware("doctor"), async (req, res) => {
  try {
    const profile = await Doctor.findOne({ user: req.user.id }).lean();
    res.json(profile || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET ALL DOCTORS (supports ?search=name&specialization=Cardiology — verified only)
router.get("/", async (req, res) => {
  try {
    const { search, specialization, minFee, maxFee, minRating } = req.query;

    const userQuery = { role: "doctor" };
    if (search) {
      userQuery.name = { $regex: search, $options: "i" };
    }

    const doctors = await User.find(userQuery).select("name email").lean();

    let doctorsWithProfile = await Promise.all(
      doctors.map(async (doc) => {
        const profile = await Doctor.findOne({ user: doc._id, verified: true }).lean();
        return { ...doc, profile: profile || null };
      })
    );

    // Only return doctors that have a verified profile
    doctorsWithProfile = doctorsWithProfile.filter((d) => d.profile !== null);

    if (specialization) {
      doctorsWithProfile = doctorsWithProfile.filter(
        (d) => d.profile?.specialization?.toLowerCase().includes(specialization.toLowerCase())
      );
    }

    if (minFee !== undefined) {
      doctorsWithProfile = doctorsWithProfile.filter(d => (d.profile?.consultationFee ?? 0) >= Number(minFee));
    }
    if (maxFee !== undefined) {
      doctorsWithProfile = doctorsWithProfile.filter(d => (d.profile?.consultationFee ?? 0) <= Number(maxFee));
    }
    // Attach average ratings from appointments
    doctorsWithProfile = await Promise.all(
      doctorsWithProfile.map(async (d) => {
        const rated = await Appointment.find({ doctor: d._id, rating: { $gt: 0 } }).select('rating').lean()
        const avg = rated.length ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length) : 0
        return { ...d, averageRating: Math.round(avg * 10) / 10, reviewCount: rated.length }
      })
    )

    if (minRating !== undefined && Number(minRating) > 0) {
      doctorsWithProfile = doctorsWithProfile.filter(d => (d.averageRating ?? 0) >= Number(minRating));
    }

    res.json(doctorsWithProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET UNIQUE SPECIALIZATIONS (verified doctors only)
router.get("/specializations", async (req, res) => {
  try {
    const profiles = await Doctor.find({ verified: true }).select("specialization").lean();
    const unique = [...new Set(profiles.map((p) => p.specialization).filter(Boolean))].sort();
    res.json(unique);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;