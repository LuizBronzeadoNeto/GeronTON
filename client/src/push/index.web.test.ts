/**
 * @jest-environment jsdom
 */
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as webPush from "./index.web";
import type { PushModule } from "./types";
import { getVapidPublicKey, registerSubscription } from "../api/push";
import { readEndpoint, writeEndpoint } from "../api/pushStorage";

jest.mock("../api/push");
jest.mock("../api/pushStorage");

/**
 * Tests for the web half of the push module.
 *
 * This is the payoff of splitting the module by filename instead of branching
 * on Platform.OS at runtime. jest-expo inherits react-native's haste platforms
 * (android, ios, native) and "web" is not among them, so nothing resolves
 * .web.ts automatically — but importing it by its explicit filename loads
 * exactly the file the browser bundle would, and the jsdom environment supplies
 * the navigator it talks to. No test has to pretend to be on another platform.
 */

/**
 * Puts the web variant back under the compiler. TypeScript resolves ../push
 * to index.ts everywhere else, so without this the two variants could drift
 * apart and nothing would notice until runtime.
 */
const contract: PushModule = webPush;

const VAPID = "BHhpLzQrq1cB0gQFvxHJfWKTx4kQyOZq6-test-key-value_ABC";

interface FakeSubscription {
  endpoint: string;
  toJSON: () => {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };
}

function makeSubscription(
  endpoint = "https://push.example/abc",
): FakeSubscription {
  return {
    endpoint,
    toJSON: () => ({
      endpoint,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    }),
  };
}

const subscribeMock = jest.fn<() => Promise<FakeSubscription>>();
const getSubscriptionMock = jest.fn<() => Promise<FakeSubscription | null>>();
const requestPermissionMock = jest.fn<() => Promise<string>>();
let messageListeners: ((event: MessageEvent) => void)[] = [];

/**
 * jsdom ships none of the push APIs, so the whole browser surface the module
 * talks to is stood up here — which also makes each "capability missing" case a
 * matter of deleting one global.
 *
 * This runs once rather than per test, and deliberately so: index.web.ts
 * memoises its service-worker registration in module state, which a static
 * import keeps alive for the whole file. Rebuilding the mocks per test would
 * leave that cache pointing at the previous test's objects, and the failures
 * read as bugs in the module rather than in the harness. Per-test setup resets
 * behaviour on these stable mocks instead of replacing them.
 */
const registration = {
  pushManager: {
    subscribe: subscribeMock,
    getSubscription: getSubscriptionMock,
  },
};

Object.defineProperty(navigator, "serviceWorker", {
  configurable: true,
  value: {
    register: jest.fn(async () => registration),
    addEventListener: (_type: string, listener: unknown) => {
      messageListeners.push(listener as (event: MessageEvent) => void);
    },
    removeEventListener: (_type: string, listener: unknown) => {
      messageListeners = messageListeners.filter((l) => l !== listener);
    },
  },
});

(globalThis as { Notification?: unknown }).Notification = {
  permission: "default",
  requestPermission: requestPermissionMock,
};
globalThis.atob = (value: string) =>
  Buffer.from(value, "base64").toString("binary");

const PUSH_MANAGER = function PushManager() {};

function notificationApi() {
  return globalThis.Notification as unknown as { permission: string };
}

beforeEach(() => {
  jest.clearAllMocks();
  messageListeners = [];

  (globalThis as { PushManager?: unknown }).PushManager = PUSH_MANAGER;
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
  });
  notificationApi().permission = "default";

  requestPermissionMock.mockResolvedValue("granted");
  subscribeMock.mockImplementation(async () => makeSubscription());
  getSubscriptionMock.mockResolvedValue(null);
  jest.mocked(getVapidPublicKey).mockResolvedValue(VAPID);
  jest.mocked(registerSubscription).mockResolvedValue(undefined);
  jest.mocked(readEndpoint).mockResolvedValue(null);
  jest.mocked(writeEndpoint).mockResolvedValue(undefined);
});

describe("getSupport", () => {
  it("reports available when the browser has the push APIs", () => {
    expect(contract.getSupport()).toBe("available");
  });

  /**
   * The iPhone case. Safari hides PushManager entirely in a normal tab and
   * exposes it only inside a web app installed to the Home Screen, so this is
   * how an iPhone that *could* receive notifications is told apart from a
   * browser that never will.
   */
  it("tells an uninstalled iPhone apart from an unsupported browser", () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    });

    expect(contract.getSupport()).toBe("needs-install");
  });

  it("reports unsupported on a desktop browser without push", () => {
    delete (globalThis as { PushManager?: unknown }).PushManager;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/50.0",
    });

    expect(contract.getSupport()).toBe("unsupported");
  });
});

describe("requestAndRegister", () => {
  /**
   * The invariant that only breaks on iOS. Safari treats the user-gesture token
   * as spent the moment the handler yields, so a permission prompt requested
   * after an await is refused with no error at all — it simply never appears.
   * Asserting the call order is the only cheap way to catch a regression here;
   * the alternative is a real iPhone.
   */
  it("prompts for permission before awaiting anything else", async () => {
    await contract.requestAndRegister();

    const promptOrder = requestPermissionMock.mock.invocationCallOrder[0];
    const keyOrder = jest.mocked(getVapidPublicKey).mock.invocationCallOrder[0];

    expect(promptOrder).toBeLessThan(keyOrder);
  });

  it("registers the subscription and remembers its endpoint", async () => {
    const result = await contract.requestAndRegister();

    expect(registerSubscription).toHaveBeenCalledWith({
      transport: "webpush",
      endpoint: "https://push.example/abc",
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    });
    expect(writeEndpoint).toHaveBeenCalledWith("https://push.example/abc");
    expect(result).toEqual({ endpoint: "https://push.example/abc" });
  });

  it("registers nothing when the user declines", async () => {
    requestPermissionMock.mockResolvedValue("denied");

    const result = await contract.requestAndRegister();

    expect(result).toBeNull();
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(registerSubscription).not.toHaveBeenCalled();
  });

  /**
   * A server with no VAPID keys answers null, and subscribing against a key the
   * server cannot sign with would produce a subscription that silently never
   * receives anything.
   *
   * Needs its own module instance: the key is memoised for the lifetime of the
   * page, so the copy imported at the top of this file is already holding one
   * from an earlier test and would never ask again.
   */
  it("does not subscribe when the server has no key configured", async () => {
    jest.mocked(getVapidPublicKey).mockResolvedValue(null);

    let fresh: typeof webPush | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fresh = require("./index.web") as typeof webPush;
    });

    expect(await fresh!.requestAndRegister()).toBeNull();
    expect(subscribeMock).not.toHaveBeenCalled();
  });
});

describe("syncExisting", () => {
  it("does nothing when permission was never granted", async () => {
    notificationApi().permission = "default";

    expect(await contract.syncExisting()).toBeNull();
    expect(registerSubscription).not.toHaveBeenCalled();
  });

  it("skips the request when the stored endpoint is still current", async () => {
    notificationApi().permission = "granted";
    getSubscriptionMock.mockResolvedValue(makeSubscription());
    jest.mocked(readEndpoint).mockResolvedValue("https://push.example/abc");

    const result = await contract.syncExisting();

    expect(result).toEqual({ endpoint: "https://push.example/abc" });
    expect(registerSubscription).not.toHaveBeenCalled();
  });

  /**
   * Endpoints rotate, and a second person signing in on the same browser has to
   * take the device over. Both show up here as "the live endpoint is not the
   * one we stored".
   */
  it("re-registers when the live endpoint differs from the stored one", async () => {
    notificationApi().permission = "granted";
    getSubscriptionMock.mockResolvedValue(
      makeSubscription("https://push.example/rotated"),
    );
    jest.mocked(readEndpoint).mockResolvedValue("https://push.example/old");

    const result = await contract.syncExisting();

    expect(registerSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://push.example/rotated" }),
    );
    expect(result).toEqual({ endpoint: "https://push.example/rotated" });
  });
});

describe("addForegroundListener", () => {
  it("delivers a push the worker forwarded and ignores unrelated messages", () => {
    const handler = jest.fn();
    const push = {
      title: "Intercorrência crítica",
      body: "Maria Silva: Queda",
      critical: true,
      data: { profileId: "7" },
    };

    const remove = contract.addForegroundListener(handler);

    messageListeners.forEach((listener) =>
      listener({ data: { type: "geronton-push", push } } as MessageEvent),
    );
    expect(handler).toHaveBeenCalledWith(push);

    handler.mockClear();
    messageListeners.forEach((listener) =>
      listener({ data: { type: "workbox-something" } } as MessageEvent),
    );
    expect(handler).not.toHaveBeenCalled();

    remove();
    expect(messageListeners).toHaveLength(0);
  });
});
