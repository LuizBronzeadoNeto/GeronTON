import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import healthRouter from "./routes/health.js";
import loginRouter from "./routes/login.js";
import caregiversRouter from "./routes/caregivers.js";
import professionalRouter from "./routes/professionals.js";
import profilesRouter from "./routes/profiles.js";
import { alertsDashboardRouter } from "./routes/alerts.js";
import { triageRouter } from "./routes/triage.js";
import notificationsRouter from "./routes/notifications.js";
import { reportsRouter } from "./routes/reports.js";
import consentRouter from "./routes/consent.js";
import accountRouter from "./routes/account.js";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_REQUEST_LIMIT = 300;
const LOGIN_ATTEMPT_LIMIT = 10;
const REGISTRATION_LIMIT = 5;
const MAX_BODY_SIZE = "100kb";

/**
 * Browser origins allowed to call the API, read from CORS_ORIGIN as a
 * comma-separated list. The web build is served from the same origin as the API
 * so it needs no entry here, and native clients send no Origin header at all;
 * this exists to keep third-party sites out and as an escape hatch if the web
 * app ever moves to its own subdomain.
 */
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Rate limiting is disabled under test so the integration suite can sign in as
 * many times as it needs. The limits themselves are exercised manually against
 * a running deployment.
 */
const skipInTests = (): boolean => process.env.NODE_ENV === "test";

const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: GLOBAL_REQUEST_LIMIT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
});

/**
 * Brute-force guard for the credential check. Successful sign-ins are not
 * counted, so a caregiver logging in repeatedly from a shared clinic IP is never
 * locked out; only failed attempts consume the budget.
 */
const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_ATTEMPT_LIMIT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
});

/**
 * Account creation is open to the public, so unlike the login guard this counts
 * successful requests too: the risk here is bulk account creation rather than
 * guessing. A handful an hour per address is far above what a real person needs
 * and far below what makes automated sign-up worthwhile.
 */
const registrationLimiter = rateLimit({
  windowMs: REGISTRATION_WINDOW_MS,
  limit: REGISTRATION_LIMIT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: skipInTests,
});

/**
 * Folder with the web build (expo export output). When set, this process
 * serves the web app next to the API, so both live on one origin. The Heroku
 * image sets it; in local development it stays unset and Expo serves the web
 * app instead.
 */
const webDir = process.env.WEB_DIR
  ? path.resolve(process.env.WEB_DIR)
  : undefined;
const webIndex = webDir ? path.join(webDir, "index.html") : undefined;
const servesWeb = webIndex !== undefined && fs.existsSync(webIndex);

/**
 * The deployed clients call the API under /api, which keeps it apart from the
 * web app's pages on the same origin. The prefix is dropped here so the routes
 * keep their paths, and local development, which calls them without it, works
 * the same.
 */
const stripApiPrefix: RequestHandler = (req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/")) {
    req.url = req.url.slice(4) || "/";
  } else if (req.url.startsWith("/api?")) {
    req.url = `/${req.url.slice(4)}`;
  }
  next();
};

/**
 * Sends plain HTTP requests to HTTPS in production. Heroku answers on both
 * and only tells the app through X-Forwarded-Proto, so without this a first
 * visit typed as http:// would send the login unencrypted. Requests that don't
 * come through the router carry no header and pass through.
 */
const forceHttps: RequestHandler = (req, res, next) => {
  const proto = req.headers["x-forwarded-proto"];
  if (process.env.NODE_ENV === "production" && proto === "http") {
    res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
    return;
  }
  next();
};

const app = express();

app.use(forceHttps);
app.use(stripApiPrefix);

/**
 * The API runs behind a TLS-terminating reverse proxy in production, so Express
 * must trust one hop of X-Forwarded-* headers. Without this every request looks
 * like it came from the proxy and rate limiting would apply one shared budget to
 * all clients.
 */
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: MAX_BODY_SIZE }));

app.use(healthRouter);

// Static files go before the rate limiter: loading the web app fetches a
// dozen assets, which would eat into the API budget for no reason.
if (servesWeb) {
  app.use(express.static(webDir!, { index: false }));
}

app.use(globalLimiter);
app.use("/login", loginLimiter);
app.use("/cuidadores", registrationLimiter);
app.use("/profissionais", registrationLimiter);

app.use(loginRouter);
app.use("/cuidadores", caregiversRouter);
app.use("/profissionais", professionalRouter);
app.use("/perfis", profilesRouter);
app.use("/alertas", alertsDashboardRouter);
app.use("/notificacoes", notificationsRouter);
app.use("/triagem", triageRouter);
app.use("/relatorios", reportsRouter);
app.use("/consentimento", consentRouter);
app.use("/conta", accountRouter);

/**
 * Any other GET (or HEAD) from a browser gets the web app's index.html, so
 * reloading the page works. Requests that don't accept HTML (the API clients)
 * still get the plain 404.
 */
if (servesWeb) {
  app.use((req, res, next) => {
    const isRead = req.method === "GET" || req.method === "HEAD";
    if (!isRead || !req.accepts("html")) return next();
    res.sendFile(webIndex!);
  });
}

/**
 * Status a rejected request carries when the failure is the client's fault.
 * express.json() tags oversized bodies and unparseable JSON this way, and
 * without honouring it both would answer 500.
 */
function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }

  const { status, statusCode } = err as {
    status?: unknown;
    statusCode?: unknown;
  };
  const candidate = typeof status === "number" ? status : statusCode;

  return typeof candidate === "number" && candidate >= 400 && candidate < 500
    ? candidate
    : undefined;
}

/**
 * Central error handler. Express 5 forwards rejected promises from async route
 * handlers here, so routes can `throw` instead of repeating try/catch.
 *
 * Malformed or oversized requests are answered with their own 4xx status and
 * are not logged: they are the caller's mistake, and reporting them as 500s
 * both misleads the client and buries genuine faults in the error log.
 * Everything else responds with a generic 500 to avoid leaking internals.
 *
 * Only the error's name, message and stack are logged. Logging the whole object
 * would print Prisma's query parameters, which for this API means an elder's
 * health data and submitted passwords ending up in stdout.
 */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const clientStatus = clientErrorStatus(err);

  if (clientStatus !== undefined) {
    res.status(clientStatus).json({ error: "Malformed request" });
    return;
  }

  if (err instanceof Error) {
    console.error({ name: err.name, message: err.message, stack: err.stack });
  } else {
    console.error("Non-error thrown by a request handler");
  }

  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
