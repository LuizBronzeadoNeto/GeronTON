import { Router, Request, Response } from "express";
import { PushTransport } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { getVapidPublicKey } from "../services/push.js";

const router = Router();

router.use(authMiddleware);

const MAX_ENDPOINT_LENGTH = 1024;
const EXPO_TOKEN_PREFIX = "ExponentPushToken[";

/**
 * GET /notificacoes/chave-publica — the VAPID public key a browser must pass to
 * PushManager.subscribe, or null when web push is not configured on this
 * deployment. Serving it from the API rather than inlining it into the web
 * bundle means rotating the keypair does not require re-exporting and
 * redeploying the client, and gives the client an explicit signal to hide the
 * enable button instead of subscribing against a key the server cannot sign
 * with.
 */
router.get("/chave-publica", (_req: Request, res: Response) => {
  return res.json({ publicKey: getVapidPublicKey() });
});

/**
 * POST /notificacoes/inscricoes — register this device to receive pushes.
 *
 * Two body shapes, discriminated by transport:
 *   { transport: "expo",    token: "ExponentPushToken[...]" }
 *   { transport: "webpush", endpoint: "https://...", keys: { p256dh, auth } }
 *
 * Idempotent by endpoint: registering the same device again updates the owning
 * user instead of adding a row. That is what makes a shared device safe — if a
 * professional signs in on a caregiver's tablet, the caregiver stops receiving
 * that tablet's notifications rather than both of them receiving everything.
 * Responds 201.
 */
router.post("/inscricoes", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const userId = req.user!.id;

  if (body.transport === PushTransport.expo) {
    const token: unknown = body.token;

    if (typeof token !== "string" || !token.startsWith(EXPO_TOKEN_PREFIX)) {
      return res
        .status(400)
        .json({ error: "token must be an Expo push token." });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: token },
      update: {
        userId,
        transport: PushTransport.expo,
        p256dh: null,
        auth: null,
      },
      create: { userId, transport: PushTransport.expo, endpoint: token },
    });

    return res
      .status(201)
      .json({ id: subscription.id, transport: subscription.transport });
  }

  if (body.transport === PushTransport.webpush) {
    const endpoint: unknown = body.endpoint;
    const keys = body.keys ?? {};

    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      endpoint.length > MAX_ENDPOINT_LENGTH
    ) {
      return res.status(400).json({ error: "endpoint must be an https URL." });
    }
    if (
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string" ||
      !keys.p256dh ||
      !keys.auth
    ) {
      return res
        .status(400)
        .json({ error: "keys.p256dh and keys.auth are required." });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        transport: PushTransport.webpush,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        transport: PushTransport.webpush,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return res
      .status(201)
      .json({ id: subscription.id, transport: subscription.transport });
  }

  return res.status(400).json({
    error: `Invalid transport '${String(body.transport)}', must be one of: ${Object.values(PushTransport).join(", ")}`,
  });
});

/**
 * DELETE /notificacoes/inscricoes — stop pushing to this device. The endpoint
 * travels in the body because a web push endpoint is itself a URL and does not
 * survive a path segment cleanly. Scoped to the caller's own rows, and answered
 * 204 whether or not anything matched, so signing out twice is not an error.
 */
router.delete("/inscricoes", async (req: Request, res: Response) => {
  const endpoint: unknown = (req.body ?? {}).endpoint;

  if (typeof endpoint !== "string" || !endpoint) {
    return res.status(400).json({ error: "endpoint is required." });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.user!.id },
  });

  return res.status(204).send();
});

export default router;
