const express = require("express");
const router = express.Router();
const DoctorAvailability = require("../models/DoctorAvailability");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Helper: convert "HH:MM" to total minutes for easy comparison
const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper: check if two time ranges overlap
const timesOverlap = (startA, endA, startB, endB) => {
  return toMinutes(startA) < toMinutes(endB) &&
         toMinutes(endA) > toMinutes(startB);
};

// POST /api/availability — Add a new availability slot (doctors only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("doctor"),
  async (req, res) => {
    try {
      console.log("1. Route hit");
      console.log("2. User:", req.user);

      const { day, startTime, endTime } = req.body;
      console.log("3. Body:", { day, startTime, endTime });

      if (!day || !startTime || !endTime) {
        return res.status(400).json({ message: "day, startTime, and endTime are required." });
      }

      if (toMinutes(startTime) >= toMinutes(endTime)) {
        return res.status(400).json({ message: "startTime must be before endTime." });
      }

      console.log("4. About to query MongoDB...");

      const existingSlots = await DoctorAvailability.find({
        doctor: req.user.id,
        day
      });

      console.log("5. Existing slots:", existingSlots);

      const hasConflict = existingSlots.some((slot) =>
        timesOverlap(startTime, endTime, slot.startTime, slot.endTime)
      );

      if (hasConflict) {
        return res.status(409).json({
          message: "This time slot overlaps with an existing availability slot."
        });
      }

      console.log("6. No conflict, saving...");

      const availability = new DoctorAvailability({
        doctor: req.user.id,
        day,
        startTime,
        endTime
      });

      await availability.save();

      console.log("7. Saved successfully");

      res.status(201).json({
        message: "Availability added successfully.",
        availability
      });

    } catch (error) {
      console.error("ERROR:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/availability/:doctorId — Get all availability slots for a doctor (public)
router.get("/:doctorId", async (req, res) => {
  try {
    const availability = await DoctorAvailability.find({
      doctor: req.params.doctorId
    }).sort({ day: 1, startTime: 1 });

    res.json(availability);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/availability/:id — Update an availability slot (owning doctor only)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("doctor"),
  async (req, res) => {
    try {
      const { day, startTime, endTime } = req.body;

      const slot = await DoctorAvailability.findById(req.params.id);

      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found." });
      }

      if (slot.doctor.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this slot." });
      }

      const updatedDay = day || slot.day;
      const updatedStart = startTime || slot.startTime;
      const updatedEnd = endTime || slot.endTime;

      if (toMinutes(updatedStart) >= toMinutes(updatedEnd)) {
        return res.status(400).json({ message: "startTime must be before endTime." });
      }

      const existingSlots = await DoctorAvailability.find({
        doctor: req.user.id,
        day: updatedDay,
        _id: { $ne: req.params.id }
      });

      const hasConflict = existingSlots.some((s) =>
        timesOverlap(updatedStart, updatedEnd, s.startTime, s.endTime)
      );

      if (hasConflict) {
        return res.status(409).json({
          message: "Updated slot overlaps with an existing availability slot."
        });
      }

      slot.day = updatedDay;
      slot.startTime = updatedStart;
      slot.endTime = updatedEnd;

      await slot.save();

      res.json({
        message: "Availability updated successfully.",
        availability: slot
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// DELETE /api/availability/:id — Delete an availability slot (owning doctor only)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("doctor"),
  async (req, res) => {
    try {
      const slot = await DoctorAvailability.findById(req.params.id);

      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found." });
      }

      if (slot.doctor.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this slot." });
      }

      await slot.deleteOne();

      res.json({ message: "Availability slot deleted successfully." });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;