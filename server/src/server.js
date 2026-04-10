const env = require("./config/env");
const app = require("./app");
const { ensureDir } = require("./utils/fileUtils");

const startServer = async () => {
  await Promise.all([ensureDir(env.uploadDir), ensureDir(env.tempDir)]);

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
