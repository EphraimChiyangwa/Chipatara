const Appointment = require("../models/Appointment");

// Doctor updates appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    // Only doctors allowed
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    // Allowed statuses
    const allowedStatuses = ["confirmed", "cancelled", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Ensure doctor owns appointment
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    appointment.status = status;

    await appointment.save();

    res.json({
      message: `Appointment ${status} successfully`,
      appointment
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};