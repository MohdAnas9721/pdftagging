const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const pdfRoutes = require("./routes/pdfRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

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
    message: "PDF tagging server is running.",
  });
});

app.use("/api/pdf", pdfRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
