const express = require("express");
const User = require("../models/User");
const TankReading = require("../models/TankReading");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect, adminOnly);

function calculateStatus({ lpgLevel, pressure, temperature }) {
  if (pressure >= 160 || temperature >= 55 || lpgLevel >= 95 || lpgLevel <= 10)
    return "Critical";
  if (pressure >= 120 || temperature >= 45 || lpgLevel >= 85 || lpgLevel <= 20)
    return "Warning";
  return "Normal";
}

router.put("/users/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.status = "approved";

    await user.save();

    res.json({
      message: "User approved successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await user.deleteOne();

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/users", async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ users });
});

router.get("/readings", async (req, res) => {
  const { tankId, status, user, from, to, search } = req.query;
  const filter = {};

  if (tankId) filter.tankId = new RegExp(tankId, "i");
  if (status) filter.status = status;
  if (user) filter.submittedBy = user;
  if (from || to) {
    filter.readingDateTime = {};
    if (from) filter.readingDateTime.$gte = new Date(from);
    if (to) filter.readingDateTime.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { tankId: new RegExp(search, "i") },
      { remarks: new RegExp(search, "i") },
      { status: new RegExp(search, "i") },
    ];
  }

  const readings = await TankReading.find(filter)
    .populate("submittedBy", "name email")
    .sort({ createdAt: -1 });
  res.json({ readings });
});

router.put("/readings/:id", async (req, res) => {
  try {
    const reading = await TankReading.findById(req.params.id);
    if (!reading)
      return res.status(404).json({ message: "Reading not found." });

    const editable = [
      "tankId",
      "readingDateTime",
      "lpgLevel",
      "pressure",
      "temperature",
      "volume",
      "weight",
      "remarks",
    ];
    const changes = {};

    editable.forEach((field) => {
      if (req.body[field] !== undefined) {
        changes[field] = { from: reading[field], to: req.body[field] };
        reading[field] = [
          "lpgLevel",
          "pressure",
          "temperature",
          "volume",
          "weight",
        ].includes(field)
          ? Number(req.body[field])
          : req.body[field];
      }
    });

    reading.status = calculateStatus(reading);
    reading.editLogs.push({ editedBy: req.user._id, changes });
    await reading.save();

    const updated = await TankReading.findById(reading._id).populate(
      "submittedBy",
      "name email",
    );
    res.json({ message: "Reading updated successfully.", reading: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update reading.", error: error.message });
  }
});

router.delete("/readings/:id", async (req, res) => {
  const reading = await TankReading.findByIdAndDelete(req.params.id);
  if (!reading) return res.status(404).json({ message: "Reading not found." });
  res.json({ message: "Reading deleted successfully." });
});

router.get("/export/csv", protect, adminOnly, async (req, res) => {
  try {
    const readings = await TankReading.find()
      .populate("submittedBy", "name email")
      .sort({ readingDateTime: 1 });

    const title = [
      "",
      "",
      "",
      "",
      "TANK FARM OPERATION PMS and MONITORING CHECKLIST",
    ];

    const header1 = [
      "Item No.",
      "LPG TANK 1",
      "",
      "",
      "LPG TANK 2",
      "",
      "",
      "LPG TANK 3",
      "",
      "",
      "LPG TANK 4",
      "",
      "",
      "Temperature (°C)",
      "Date",
      "Issues",
      "Input By",
    ];

    const header2 = [
      "",
      "Tank Level (%)",
      "Pressure (psi/bar or percentage)",
      "Leakage Detection Status",

      "Tank Level (%)",
      "Pressure (psi/bar or percentage)",
      "Leakage Detection Status",

      "Tank Level (%)",
      "Pressure (psi/bar or percentage)",
      "Leakage Detection Status",

      "Tank Level (%)",
      "Pressure (psi/bar or percentage)",
      "Leakage Detection Status",

      "",
      "",
      "",
      "",
    ];

    const rows = readings.map((r, index) => {
      const row = [
        index + 1,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        r.temperature ?? "",
        r.readingDateTime
          ? new Date(r.readingDateTime).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "",
        r.remarks || "",
        r.submittedBy?.name || "Unknown",
      ];

      let startIndex = null;

      if (r.tankId === "LPG Tank 1") startIndex = 1;
      if (r.tankId === "LPG Tank 2") startIndex = 4;
      if (r.tankId === "LPG Tank 3") startIndex = 7;
      if (r.tankId === "LPG Tank 4") startIndex = 10;

      if (startIndex !== null) {
        row[startIndex] = `${r.lpgLevel}%`;
        row[startIndex + 1] =
          r.pressureUnit === "percent" ? `${r.pressure}%` : `${r.pressure} PSI`;
        row[startIndex + 2] = "No Leak";
      }

      return row;
    });

    const csvRows = [title, [], header1, header2, ...rows];

    const csv = csvRows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tank-farm-monitoring-checklist.csv",
    );

    res.send(csv);
  } catch (error) {
    res.status(500).json({
      message: "CSV export failed.",
      error: error.message,
    });
  }
});

module.exports = router;
