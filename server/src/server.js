const mongoose = require("mongoose");
const env = require("./config/env");
const app = require("./app");
const { ensureDir } = require("./utils/fileUtils");

const startServer = async () => {
  mongoose.set("bufferCommands", false);
  await Promise.all([ensureDir(env.uploadDir), ensureDir(env.tempDir)]);

  try {
    await mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDatabase,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected to database "${env.mongodbDatabase}".`);
  } catch (error) {
    console.warn(
      `MongoDB connection unavailable. Inline tagging API will stay disabled until MONGODB_URI is reachable. (${error.message})`
    );
  }

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
