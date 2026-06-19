const Appointment = require("../models/Appointment");
const DoctorAvailability = require("../models/DoctorAvailability");

// Helper: convert "HH:MM" to total minutes
const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper: get day name from a date string e.g. "Monday"
const getDayName = (dateStr) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(dateStr).getDay()];
};

// Helper: extract "HH:MM" time from a date string
const getTimeString = (dateStr) => {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// POST /api/appointments — Book an appointment (patients only)
exports.bookAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can book appointments." });
    }

    const { doctorId, date, reason } = req.body;

    if (!doctorId || !date || !reason) {
      return res.status(400).json({ message: "doctorId, date, and reason are required." });
    }

    const appointmentDate = new Date(date);

    if (isNaN(appointmentDate)) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    if (appointmentDate < new Date()) {
      return res.status(400).json({ message: "Cannot book an appointment in the past." });
    }

    const dayName = getDayName(date);
    const appointmentTime = getTimeString(date);

    // Check doctor has availability on that day
    const availabilitySlots = await DoctorAvailability.find({
      doctor: doctorId,
      day: dayName
    });

    if (availabilitySlots.length === 0) {
      return res.status(400).json({
        message: `The doctor is not available on ${dayName}.`
      });
    }

    // Check the appointment time falls within one of the doctor's slots
    const aptMinutes = toMinutes(appointmentTime);
    const withinSlot = availabilitySlots.some((slot) =>
      aptMinutes >= toMinutes(slot.startTime) && aptMinutes < toMinutes(slot.endTime)
    );

    if (!withinSlot) {
      return res.status(400).json({
        message: `The requested time (${appointmentTime}) is outside the doctor's available hours on ${dayName}.`
      });
    }

    // Check no existing confirmed/pending appointment exists at the same time for this doctor
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date: appointmentDate,
      status: { $in: ["pending", "confirmed"] }
    });

    if (conflict) {
      return res.status(409).json({
        message: "This time slot is already booked. Please choose a different time."
      });
    }

    const appointment = new Appointment({
      patient: req.user.id,
      doctor: doctorId,
      date: appointmentDate,
      reason,
      status: "pending"
    });

    await appointment.save();

    res.status(201).json({
      message: "Appointment booked successfully.",
      appointment
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/appointments/:id/status — Doctor updates appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    const allowedStatuses = ["confirmed", "cancelled", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }

    appointment.status = status;
    await appointment.save();

    res.json({
      message: `Appointment ${status} successfully.`,
      appointment
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};