import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let caregiverId: number;
let professionalId: number;

/**
 * Every fixture endpoint carries this prefix so cleanup is one statement and
 * cannot touch a real subscription.
 */
const FIXTURE_PREFIX = "https://test.example/push/";
const FIXTURE_EXPO_TOKEN = "ExponentPushToken[test-example-0001]";
const KEYS = { p256dh: "p256dh-fixture-value", auth: "auth-fixture-value" };

/**
 * Registration tests for the push subscription endpoints. The behaviour worth
 * protecting here is not "a row gets written" but who the row belongs to after
 * the same physical device is registered twice.
 */
beforeAll(async () => {
  const caregiverRes = await request(app)
    .post("/login")
    .send({ email: "cuidador@demo.com", password: "senha123" });
  expect(caregiverRes.status).toBe(200);
  caregiverToken = caregiverRes.body.token;

  const professionalRes = await request(app)
    .post("/login")
    .send({ email: "profissional@demo.com", password: "senha123" });
  expect(professionalRes.status).toBe(200);
  professionalToken = professionalRes.body.token;

  const caregiver = await prisma.user.findUnique({
    where: { email: "cuidador@demo.com" },
  });
  const professional = await prisma.user.findUnique({
    where: { email: "profissional@demo.com" },
  });
  caregiverId = caregiver!.id;
  professionalId = professional!.id;
});

afterAll(async () => {
  await prisma.pushSubscription.deleteMany({
    where: {
      OR: [
        { endpoint: { startsWith: FIXTURE_PREFIX } },
        { endpoint: FIXTURE_EXPO_TOKEN },
      ],
    },
  });
  await prisma.$disconnect();
});

function register(token: string, body: unknown) {
  return request(app)
    .post("/notificacoes/inscricoes")
    .set("Authorization", `Bearer ${token}`)
    .send(body as object);
}

function webpushBody(endpoint: string) {
  return { transport: "webpush", endpoint, keys: KEYS };
}

describe("GET /notificacoes/chave-publica", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/notificacoes/chave-publica");

    expect(res.status).toBe(401);
  });

  /**
   * Asserts the wiring rather than a fixed value: whether web push is
   * configured depends on the developer's .env, and both outcomes are correct.
   * A null key is what the client uses to hide the enable button instead of
   * subscribing against a key the server could not sign with.
   */
  it("returns the configured key, or null when web push is off", async () => {
    const res = await request(app)
      .get("/notificacoes/chave-publica")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe(process.env.VAPID_PUBLIC_KEY ?? null);
  });
});

describe("POST /notificacoes/inscricoes", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/notificacoes/inscricoes")
      .send(webpushBody(`${FIXTURE_PREFIX}unauthenticated`));

    expect(res.status).toBe(401);
  });

  it("stores a web push subscription with its encryption keys", async () => {
    const endpoint = `${FIXTURE_PREFIX}store`;

    const res = await register(caregiverToken, webpushBody(endpoint));

    expect(res.status).toBe(201);
    expect(res.body.transport).toBe("webpush");

    const stored = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });
    expect(stored).toMatchObject({
      userId: caregiverId,
      transport: "webpush",
      p256dh: KEYS.p256dh,
      auth: KEYS.auth,
    });
  });

  it("stores an Expo push token", async () => {
    const res = await register(caregiverToken, {
      transport: "expo",
      token: FIXTURE_EXPO_TOKEN,
    });

    expect(res.status).toBe(201);

    const stored = await prisma.pushSubscription.findUnique({
      where: { endpoint: FIXTURE_EXPO_TOKEN },
    });
    expect(stored).toMatchObject({
      userId: caregiverId,
      transport: "expo",
      p256dh: null,
      auth: null,
    });
  });

  it("is idempotent when the same device registers twice", async () => {
    const endpoint = `${FIXTURE_PREFIX}idempotent`;

    await register(caregiverToken, webpushBody(endpoint));
    await register(caregiverToken, webpushBody(endpoint));

    const count = await prisma.pushSubscription.count({ where: { endpoint } });
    expect(count).toBe(1);
  });

  /**
   * The reason endpoint is unique on its own rather than paired with userId. A
   * device belongs to whoever signed in last: if a professional registers a
   * tablet a caregiver had registered, the caregiver must stop receiving that
   * tablet's notifications rather than both of them receiving everything.
   */
  it("moves the device to the new user instead of duplicating it", async () => {
    const endpoint = `${FIXTURE_PREFIX}handover`;

    await register(caregiverToken, webpushBody(endpoint));
    await register(professionalToken, webpushBody(endpoint));

    const rows = await prisma.pushSubscription.findMany({
      where: { endpoint },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(professionalId);
  });

  it("rejects a token that is not an Expo push token", async () => {
    const res = await register(caregiverToken, {
      transport: "expo",
      token: "not-a-token",
    });

    expect(res.status).toBe(400);
  });

  it("rejects a non-https endpoint", async () => {
    const res = await register(
      caregiverToken,
      webpushBody("http://test.example/push/insecure"),
    );

    expect(res.status).toBe(400);
  });

  it("rejects a web push subscription missing an encryption key", async () => {
    const res = await register(caregiverToken, {
      transport: "webpush",
      endpoint: `${FIXTURE_PREFIX}nokeys`,
      keys: { p256dh: KEYS.p256dh },
    });

    expect(res.status).toBe(400);
  });

  it("rejects an unknown transport", async () => {
    const res = await register(caregiverToken, {
      transport: "sms",
      endpoint: `${FIXTURE_PREFIX}sms`,
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /notificacoes/inscricoes", () => {
  it("removes the device and stays successful when repeated", async () => {
    const endpoint = `${FIXTURE_PREFIX}remove`;
    await register(caregiverToken, webpushBody(endpoint));

    const first = await request(app)
      .delete("/notificacoes/inscricoes")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ endpoint });
    const second = await request(app)
      .delete("/notificacoes/inscricoes")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ endpoint });

    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      0,
    );
  });

  it("does not remove a device belonging to someone else", async () => {
    const endpoint = `${FIXTURE_PREFIX}not-mine`;
    await register(caregiverToken, webpushBody(endpoint));

    const res = await request(app)
      .delete("/notificacoes/inscricoes")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ endpoint });

    expect(res.status).toBe(204);
    expect(await prisma.pushSubscription.count({ where: { endpoint } })).toBe(
      1,
    );
  });

  it("rejects a request with no endpoint", async () => {
    const res = await request(app)
      .delete("/notificacoes/inscricoes")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
