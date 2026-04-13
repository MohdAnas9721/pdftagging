const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const resolveAppPath = (targetPath, fallbackFolder) => {
  const candidate = targetPath || fallbackFolder;
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate);
};

const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 15),
  chromePath: process.env.CHROME_PATH || "",
  uploadDir: resolveAppPath(process.env.UPLOAD_DIR, "uploads"),
  tempDir: resolveAppPath(process.env.TEMP_DIR, "temp"),
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/leometric",
  mongodbDatabase: process.env.MONGODB_DATABASE || "leometric",
};

module.exports = env;
