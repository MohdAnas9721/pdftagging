const sendSuccess = (res, { statusCode = 200, message, data }) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = {
  sendSuccess,
  AppError,
};
