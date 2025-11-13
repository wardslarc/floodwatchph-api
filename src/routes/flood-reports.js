import express from "express";
import { body, validationResult } from "express-validator";
import FloodReport from "../models/FloodReport.js";
import { auth } from "../middleware/auth.js"; // Use 'auth' instead of 'authenticateToken'
import logger from "../utils/logger.js";

const router = express.Router();

// Validation rules
const reportValidation = [
  body("severity").isIn(["light", "moderate", "severe"]).withMessage("Invalid severity level"),
  body("location").notEmpty().withMessage("Location is required"),
  body("description").optional().isLength({ max: 1000 }).withMessage("Description too long"),
  body("latitude").optional().isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  body("longitude").optional().isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
];

// Submit flood report - PROTECTED ROUTE
router.post("/submit", auth, reportValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { severity, location, description, latitude, longitude } = req.body;

    // Create new flood report with user info
    const floodReport = new FloodReport({
      severity,
      location,
      description,
      latitude,
      longitude,
      reportedBy: req.userId, // Use the standardized userId from auth middleware
      status: "active",
    });

    await floodReport.save();

    logger.info("New flood report submitted", {
      reportId: floodReport._id,
      location,
      severity,
      userId: req.userId,
    });

    res.status(201).json({
      success: true,
      message: "Flood report submitted successfully",
      data: floodReport,
    });
  } catch (error) {
    logger.error("Error submitting flood report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit flood report",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get all flood reports - PUBLIC ROUTE (can be accessed without auth)
router.get("/", async (req, res) => {
  try {
    const { severity, status, limit = 50, page = 1 } = req.query;
    
    let filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await FloodReport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await FloodReport.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      count: reports.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    logger.error("Error fetching flood reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flood reports",
    });
  }
});

// Get single flood report by ID - PUBLIC ROUTE
router.get("/:id", async (req, res) => {
  try {
    const report = await FloodReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Flood report not found",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error("Error fetching flood report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flood report",
    });
  }
});

// Get flood reports for current user - PROTECTED ROUTE
router.get("/user/my-reports", auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await FloodReport.find({ reportedBy: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    const total = await FloodReport.countDocuments({ reportedBy: req.userId });

    res.json({
      success: true,
      data: reports,
      count: reports.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    logger.error("Error fetching user flood reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your flood reports",
    });
  }
});

// Update flood report status - PROTECTED ROUTE (only report owner or admin)
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["active", "resolved", "false_report"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const report = await FloodReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Flood report not found",
      });
    }

    // Check if user owns the report or is admin
    if (report.reportedBy.toString() !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this report",
      });
    }

    report.status = status;
    await report.save();

    logger.info("Flood report status updated", {
      reportId: report._id,
      status,
      updatedBy: req.userId,
    });

    res.json({
      success: true,
      message: "Report status updated successfully",
      data: report,
    });
  } catch (error) {
    logger.error("Error updating flood report status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update report status",
    });
  }
});

export { router as floodReportRoutes };