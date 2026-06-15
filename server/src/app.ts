import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import loginRouter from "./routes/login.js";
import caregiversRouter from "./routes/caregivers.js";
import professionalRouter from "./routes/professionals.js";
import profilesRouter from "./routes/profiles.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello World");
});

app.use(loginRouter);
app.use("/cuidadores", caregiversRouter);
app.use("/profissionais", professionalRouter);
app.use("/perfis", profilesRouter);

/**
 * Central error handler. Express 5 forwards rejected promises from async route
 * handlers here, so routes can `throw` instead of repeating try/catch. Responds
 * with a generic 500 to avoid leaking internal details.
 */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
