const express = require("express");
const router = express.Router();
const { updateAppointmentStatus } = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/authMiddleware");

router.put("/:id/status", authMiddleware, updateAppointmentStatus);

module.exports = router;