const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { sendBroadcastNotification } = require("../utils/fcmService");

const adminOnly = [authMiddleware, roleMiddleware("admin")];

// GET /api/admin/users — list all users
router.get("/users", ...adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/users/:id — delete a user
router.delete("/users/:id", ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own admin account" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/appointments — list all appointments
router.get("/appointments", ...adminOnly, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name email")
      .populate("doctor", "name email")
      .sort({ date: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/appointments/:id/status — update any appointment status
router.put("/appointments/:id/status", ...adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "confirmed", "cancelled", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = status;
    await appointment.save();

    res.json({ message: `Appointment status updated to ${status}`, appointment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/doctors — list all doctor profiles with user info
router.get("/doctors", ...adminOnly, async (req, res) => {
  try {
    const profiles = await Doctor.find().populate("user", "name email").sort({ createdAt: -1 }).lean();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/doctors/:id/verify — approve a doctor
router.put("/doctors/:id/verify", ...adminOnly, async (req, res) => {
  try {
    const profile = await Doctor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!profile) return res.status(404).json({ message: "Doctor profile not found" });
    res.json({ message: "Doctor verified successfully", profile });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/doctors/:id/reject — reject a doctor (resets to unverified)
router.put("/doctors/:id/reject", ...adminOnly, async (req, res) => {
  try {
    const profile = await Doctor.findByIdAndUpdate(req.params.id, { verified: false }, { new: true });
    if (!profile) return res.status(404).json({ message: "Doctor profile not found" });
    res.json({ message: "Doctor rejected", profile });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/stats — platform summary numbers
router.get("/stats", ...adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalUsers, totalDoctors, totalAppointments,
      pendingDoctors, newUsersThisWeek, apptThisMonth,
      revenueResult
    ] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments(),
      Doctor.countDocuments({ verified: false }),
      User.countDocuments({ _id: { $gte: require('mongoose').Types.ObjectId.createFromTime(Math.floor(startOfWeek / 1000)) } }),
      Appointment.countDocuments({ date: { $gte: startOfMonth } }),
      Appointment.aggregate([
        { $match: { status: "completed" } },
        { $lookup: { from: "doctors", localField: "doctor", foreignField: "user", as: "dp" } },
        { $unwind: { path: "$dp", preserveNullAndEmpty: true } },
        { $group: { _id: null, total: { $sum: "$dp.consultationFee" } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalDoctors,
      totalAppointments,
      pendingDoctors,
      newUsersThisWeek,
      apptThisMonth,
      totalRevenue: revenueResult[0]?.total ?? 0
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/users/:id/suspend — toggle suspend
router.put("/users/:id/suspend", ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot suspend your own account" });
    }
    user.suspended = !user.suspended;
    await user.save();
    res.json({ message: `User ${user.suspended ? "suspended" : "unsuspended"}`, suspended: user.suspended });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/broadcast — send FCM push to all / patients / doctors
router.post("/broadcast", ...adminOnly, async (req, res) => {
  try {
    const { title, body, audience } = req.body;
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "title and body are required" });
    }
    const filter = { fcmToken: { $exists: true, $ne: null } };
    if (audience === "patients") filter.role = "patient";
    else if (audience === "doctors") filter.role = "doctor";
    const users = await User.find(filter).select("fcmToken").lean();
    const tokens = users.map(u => u.fcmToken).filter(Boolean);
    const { sent } = await sendBroadcastNotification(tokens, title.trim(), body.trim(), { type: "broadcast" });
    res.json({ message: `Broadcast sent to ${sent} device(s)`, sent });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
