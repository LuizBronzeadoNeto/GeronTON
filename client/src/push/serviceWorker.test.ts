import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

/**
 * Tests for the push handler in public/sw.js.
 *
 * Push delivery itself cannot be simulated, but the decision the worker makes
 * once a push arrives can: the file is evaluated against a stand-in `self`
 * whose clients and registration are mocks, and a fake push event is
 * dispatched to the handler it registers.
 */

interface FakeClient {
  visibilityState: "visible" | "hidden";
  focused: boolean;
  postMessage: jest.Mock;
}

type Listener = (event: unknown) => void;

const SOURCE = fs.readFileSync(
  path.join(__dirname, "../../public/sw.js"),
  "utf8",
);

const PAYLOAD = {
  title: "Intercorrência crítica",
  body: "Teste Push: Dor no peito",
  critical: true,
  data: { profileId: "38" },
};

function client(
  visibilityState: FakeClient["visibilityState"],
  focused: boolean,
): FakeClient {
  return { visibilityState, focused, postMessage: jest.fn() };
}

function loadWorker(clients: FakeClient[]) {
  const listeners = new Map<string, Listener>();
  const showNotification = jest.fn(() => Promise.resolve());
  const self = {
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, listener),
    skipWaiting: jest.fn(),
    registration: { showNotification },
    clients: {
      matchAll: jest.fn(() => Promise.resolve(clients)),
      claim: jest.fn(),
    },
  };

  new Function("self", SOURCE)(self);

  async function push(payload: object): Promise<void> {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get("push")!({
      data: { json: () => payload },
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise;
      },
    });
    await pending;
  }

  return { push, showNotification };
}

describe("service worker push handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hands the push to the focused window instead of the OS", async () => {
    const focused = client("visible", true);
    const worker = loadWorker([focused]);

    await worker.push(PAYLOAD);

    expect(focused.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "geronton-push" }),
    );
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it("shows an OS notification when the window is on screen but another app has focus", async () => {
    const beside = client("visible", false);
    const worker = loadWorker([beside]);

    await worker.push(PAYLOAD);

    expect(worker.showNotification).toHaveBeenCalledWith(
      PAYLOAD.title,
      expect.objectContaining({ body: PAYLOAD.body }),
    );
    expect(beside.postMessage).not.toHaveBeenCalled();
  });

  it("shows an OS notification when no window is open", async () => {
    const worker = loadWorker([]);

    await worker.push(PAYLOAD);

    expect(worker.showNotification).toHaveBeenCalledTimes(1);
  });
});
