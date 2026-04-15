const { spawn, spawnSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const port = Number(process.env.PORT) || 5000;

const runCommand = (command, args) =>
  spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const getPortOwners = (targetPort) => {
  if (process.platform === "win32") {
    const result = runCommand("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${targetPort} -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess -Unique | ConvertTo-Json`,
    ]);

    if (result.status !== 0 || !result.stdout.trim()) {
      return [];
    }

    const parsed = JSON.parse(result.stdout);
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    return rows
      .map((row) => Number(row.OwningProcess))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  }

  const result = runCommand("lsof", ["-ti", `tcp:${targetPort}`]);

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
};

const getProcessName = (pid) => {
  if (process.platform === "win32") {
    const result = runCommand("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`,
    ]);

    return result.stdout.trim();
  }

  const result = runCommand("ps", ["-p", String(pid), "-o", "comm="]);
  return result.stdout.trim();
};

const stopProcessTree = (pid) => {
  if (process.platform === "win32") {
    const result = runCommand("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return result.status === 0;
  }

  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
};

const ensurePortAvailable = (targetPort) => {
  const owners = getPortOwners(targetPort).filter((pid) => pid !== process.pid);

  if (!owners.length) {
    return;
  }

  owners.forEach((pid) => {
    const processName = getProcessName(pid).toLowerCase();

    if (processName !== "node") {
      console.error(
        `Port ${targetPort} is in use by "${processName || "unknown"}" (PID ${pid}). Close it manually, then run the server again.`
      );
      process.exit(1);
    }

    console.log(`Stopping stale node process on port ${targetPort} (PID ${pid})...`);

    if (!stopProcessTree(pid)) {
      console.error(
        `Could not stop node process ${pid} on port ${targetPort}. Close it manually, then retry.`
      );
      process.exit(1);
    }
  });
};

const startWatcher = () => {
  const child = spawn(process.execPath, ["--watch", "index.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
      if (!child.killed) {
        child.kill(signal);
      }
    });
  });
};

ensurePortAvailable(port);
startWatcher();
