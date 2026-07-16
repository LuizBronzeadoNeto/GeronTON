import "dotenv/config";
import { assertEnv } from "./lib/env.js";
import app from "./app.js";
import { startOmissionMonitor } from "./jobs/omissionMonitor.js";

assertEnv();

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

startOmissionMonitor();
