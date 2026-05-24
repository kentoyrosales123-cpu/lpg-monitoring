const express = require("express");
const TankReading = require("../models/TankReading");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function calculateStatus({ lpgLevel, pressure, pressureUnit, temperature }) {
  const lpg = Number(lpgLevel);
  const pressureValue = Number(pressure);

  // LPG LEVEL STATUS
  let lpgStatus = "Normal";

  if (lpg < 20) {
    lpgStatus = "Critical";
  } else if (lpg >= 20 && lpg < 30) {
    lpgStatus = "Warning";
  }

  // PRESSURE STATUS
  let pressureStatus = "Normal";

  if (pressureValue < 30) {
    pressureStatus = "Critical";
  } else if (pressureValue >= 30 && pressureValue < 40) {
    pressureStatus = "Warning";
  }

  // FINAL STATUS PRIORITY
  // Critical overrides Warning
  if (lpgStatus === "Critical" || pressureStatus === "Critical") {
    return "Critical";
  }

  if (lpgStatus === "Warning" || pressureStatus === "Warning") {
    return "Warning";
  }

  return "Normal";
}

router.get("/", protect, async (req, res) => {
  try {
    const readings = await TankReading.find()
      .populate("submittedBy", "name email")
      .sort({
        createdAt: -1,
      });

    res.json({
      readings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch readings.",
      error: error.message,
    });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const {
      tankId,
      readingDateTime,
      lpgLevel,
      pressure,
      pressureUnit,
      temperature,
      remarks,
    } = req.body;

    if (
      !tankId ||
      !readingDateTime ||
      lpgLevel === undefined ||
      lpgLevel === "" ||
      pressure === undefined ||
      pressure === "" ||
      !pressureUnit
    ) {
      return res.status(400).json({
        message:
          "Tank ID, date/time, LPG level, pressure, and pressure unit are required.",
      });
    }

    const payload = {
      tankId,
      readingDateTime,
      lpgLevel: Number(lpgLevel),
      pressure: Number(pressure),
      pressureUnit,
      temperature:
        temperature === undefined || temperature === ""
          ? null
          : Number(temperature),
      remarks,
      submittedBy: req.user._id,
    };

    payload.status = calculateStatus(payload);

    const reading = await TankReading.create(payload);
    const populated = await reading.populate("submittedBy", "name email");

    res.status(201).json({
      message: "Reading submitted successfully.",
      reading: populated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to submit reading.",
      error: error.message,
    });
  }
});

module.exports = router;
