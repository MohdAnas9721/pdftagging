const mongoose = require("mongoose");
const env = require("./config/env");
const app = require("./app");
const { ensureDir } = require("./utils/fileUtils");

let server;
let isShuttingDown = false;

const closeMongooseConnection = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.connection.close();
  } catch (error) {
    console.warn(`MongoDB shutdown warning: ${error.message}`);
  }
};

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down server gracefully...`);

  await new Promise((resolve) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        console.error("Error while closing HTTP server", error);
      }
      resolve();
    });
  });

  await closeMongooseConnection();
};

const startListening = () => {
  if (isShuttingDown) {
    return;
  }

  server = app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${env.port} is already in use. Stop the existing process or use the dev launcher to free the port automatically.`
      );
      process.exit(1);
      return;
    }

    console.error("HTTP server error", error);
    process.exitCode = 1;
  });
};

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

  startListening();
};

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.once(signal, async () => {
    await shutdown(signal);
    process.exit(0);
  });
});

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
