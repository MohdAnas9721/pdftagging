const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const env = require("./config/env");
const pdfRoutes = require("./routes/pdfRoutes");
const uploadRoutes = require("./routes/upload");
const tagRoutes = require("./routes/tags");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { buildMeta } = require("./utils/leometricResponse");

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Leometric PDF tagging server is running.",
    meta: {
      ...buildMeta(),
      mongoConnected: mongoose.connection.readyState === 1,
    },
  });
});

app.use("/api/upload", uploadRoutes);
app.use("/api", tagRoutes);
app.use("/api/pdf", pdfRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
