const Appointment = require("../models/Appointment");
const DoctorAvailability = require("../models/DoctorAvailability");
const User = require("../models/User");
const { sendEmail, emailTemplates } = require("../utils/emailService");

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getDayName = (dateStr) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(dateStr).getDay()];
};

const getTimeString = (dateStr) => {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// POST /api/appointments
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
    if (isNaN(appointmentDate)) return res.status(400).json({ message: "Invalid date format." });
    if (appointmentDate < new Date()) return res.status(400).json({ message: "Cannot book an appointment in the past." });

    const dayName = getDayName(date);
    const appointmentTime = getTimeString(date);

    const availabilitySlots = await DoctorAvailability.find({ doctor: doctorId, day: dayName });
    if (availabilitySlots.length === 0) {
      return res.status(400).json({ message: `The doctor is not available on ${dayName}.` });
    }

    const aptMinutes = toMinutes(appointmentTime);
    const withinSlot = availabilitySlots.some(
      (slot) => aptMinutes >= toMinutes(slot.startTime) && aptMinutes < toMinutes(slot.endTime)
    );
    if (!withinSlot) {
      return res.status(400).json({
        message: `The requested time (${appointmentTime}) is outside the doctor's available hours on ${dayName}.`
      });
    }

    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date: appointmentDate,
      status: { $in: ["pending", "confirmed"] }
    });
    if (conflict) {
      return res.status(409).json({ message: "This time slot is already booked. Please choose a different time." });
    }

    const appointment = new Appointment({
      patient: req.user.id,
      doctor: doctorId,
      date: appointmentDate,
      reason,
      status: "pending"
    });

    await appointment.save();

    // Send confirmation email to patient
    const [patient, doctor] = await Promise.all([
      User.findById(req.user.id),
      User.findById(doctorId)
    ]);

    if (patient && doctor) {
      const { subject, html } = emailTemplates.appointmentBooked(
        patient.name, doctor.name, appointmentDate, reason
      );
      sendEmail({ to: patient.email, subject, html });
    }

    res.status(201).json({ message: "Appointment booked successfully.", appointment });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/appointments/:id/status
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

    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "name email")
      .populate("doctor", "name email");

    if (!appointment) return res.status(404).json({ message: "Appointment not found." });
    if (appointment.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }

    appointment.status = status;
    await appointment.save();

    // Notify patient of status change
    const { subject, html } = emailTemplates.appointmentStatusUpdate(
      appointment.patient.name,
      status,
      appointment.doctor.name,
      appointment.patient.name,
      appointment.date
    );
    sendEmail({ to: appointment.patient.email, subject, html });

    res.json({ message: `Appointment ${status} successfully.`, appointment });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
