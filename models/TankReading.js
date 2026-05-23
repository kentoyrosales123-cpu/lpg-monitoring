const mongoose = require("mongoose");

const tankReadingSchema = new mongoose.Schema(
  {
    tankId: {
      type: String,
      required: true,
    },

    readingDateTime: {
      type: Date,
      required: true,
    },

    // LPG LEVEL ALWAYS %
    lpgLevel: {
      type: Number,
      required: true,
    },

    // PRESSURE VALUE
    pressure: {
      type: Number,
      required: true,
    },

    // PRESSURE UNIT
    pressureUnit: {
      type: String,
      enum: ["psi", "percent"],
      default: "psi",
      required: true,
    },

    // OPTIONAL
    temperature: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["Normal", "Warning", "Critical"],
      default: "Normal",
    },

    remarks: {
      type: String,
      default: "",
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    editLogs: [
      {
        editedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        editedAt: {
          type: Date,
          default: Date.now,
        },
        changes: Object,
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("TankReading", tankReadingSchema);
