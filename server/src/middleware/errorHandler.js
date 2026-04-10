const multer = require("multer");

module.exports = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      success: false,
      message: "Uploaded PDF exceeds the configured size limit.",
    });
    return;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
    details: error.details || null,
  });
};
