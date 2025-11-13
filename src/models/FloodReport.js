import mongoose from "mongoose";

const floodReportSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ["light", "moderate", "severe"],
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  reportedBy: {
    type: String,
    default: "anonymous",
  },
  status: {
    type: String,
    enum: ["active", "resolved", "false_report"],
    default: "active",
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for geospatial queries
floodReportSchema.index({ location: "text" });
floodReportSchema.index({ createdAt: -1 });
floodReportSchema.index({ severity: 1, status: 1 });

export default mongoose.model("FloodReport", floodReportSchema);