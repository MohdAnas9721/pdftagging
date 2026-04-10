const fs = require("fs/promises");
const path = require("path");

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const writeJson = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const writeText = async (filePath, text) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, text, "utf-8");
};

module.exports = {
  ensureDir,
  writeJson,
  writeText,
};
