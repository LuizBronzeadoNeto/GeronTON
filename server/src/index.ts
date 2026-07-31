import "dotenv/config";
import { assertEnv } from "./lib/env.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { startOmissionMonitor } from "./jobs/omissionMonitor.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

assertEnv();

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

startOmissionMonitor();

/**
 * Stops accepting new connections, lets in-flight requests finish, then closes
 * the database pool. Without this a container redeploy kills open requests
 * mid-write. The timer is a backstop for connections that never drain; it is
 * unref'd so it cannot itself keep the process alive.
 */
function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, shutting down`);

  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
