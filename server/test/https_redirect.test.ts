import { describe, it, expect, afterEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

const ORIGINAL_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

describe("HTTPS redirect", () => {
  it("sends plain HTTP to HTTPS in production, keeping the path", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app)
      .post("/api/login?x=1")
      .set("Host", "geronton.example.com")
      .set("X-Forwarded-Proto", "http");

    expect(res.status).toBe(308);
    expect(res.headers.location).toBe(
      "https://geronton.example.com/api/login?x=1",
    );
  });

  it("lets HTTPS through", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app)
      .get("/health")
      .set("X-Forwarded-Proto", "https");

    expect(res.status).toBe(200);
  });

  it("lets requests without the proxy header through", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });

  it("does nothing outside production", async () => {
    const res = await request(app)
      .get("/health")
      .set("X-Forwarded-Proto", "http");

    expect(res.status).toBe(200);
  });
});
