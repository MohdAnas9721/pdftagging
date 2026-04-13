const mongoose = require("mongoose");
const env = require("../config/env");

const buildMeta = () => ({
  platform: "Leometric",
  database: env.mongodbDatabase,
  mongoState: mongoose.connection.readyState,
  generatedAt: new Date().toISOString(),
});

const sendLeometricResponse = (
  res,
  { statusCode = 200, message, data = {} }
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: buildMeta(),
  });
};

module.exports = {
  buildMeta,
  sendLeometricResponse,
};
