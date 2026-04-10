const express = require("express");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const validateJobId = require("../middleware/validateJobId");
const {
  uploadPdf,
  startProcessing,
  getStatus,
  getResult,
  reprocessPdf,
  updateAltText,
  getReport,
} = require("../controllers/pdfController");

const router = express.Router();

router.post("/upload", uploadMiddleware.single("pdf"), uploadPdf);
router.post("/process/:id", validateJobId, startProcessing);
router.get("/status/:id", validateJobId, getStatus);
router.get("/result/:id", validateJobId, getResult);
router.post("/reprocess/:id", validateJobId, reprocessPdf);
router.put("/alt-text/:id", validateJobId, updateAltText);
router.get("/report/:id", validateJobId, getReport);

module.exports = router;
