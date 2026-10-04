import { spawn } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();
let shuttingDown = false;

function startService(name, cwd, script = "dev") {
  const child = spawn(npmCommand, ["run", script], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: false,
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
    console.error(`${name} stopped with ${reason}. Stopping the other service.`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`Unable to start ${name}: ${error.message}`);
    shutdown(1);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (child.killed) {
      continue;
    }

    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGTERM");
    }
  }

  process.exitCode = exitCode;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting backend and frontend development servers...\n");
startService("Backend", "BE");
startService("Frontend", "FE");
startService("Worker", "BE", "worker:dev");
