import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";

let app: Express;
let webDir: string;

/**
 * Hosting on Heroku: the /api prefix is dropped by the app itself and the web
 * build is served from WEB_DIR. The app reads WEB_DIR when it is imported, so
 * it is imported after the folder exists.
 */
beforeAll(async () => {
  webDir = fs.mkdtempSync(path.join(os.tmpdir(), "geronton-web-"));
  fs.writeFileSync(path.join(webDir, "index.html"), "<html>GeronTON</html>");
  fs.mkdirSync(path.join(webDir, "_expo"));
  fs.writeFileSync(path.join(webDir, "_expo", "entry.js"), "console.log(1)");
  process.env.WEB_DIR = webDir;
  app = (await import("../src/app.js")).default;
});

afterAll(() => {
  delete process.env.WEB_DIR;
  fs.rmSync(webDir, { recursive: true, force: true });
});

describe("/api prefix", () => {
  it("reaches the routes with or without the prefix", async () => {
    const withPrefix = await request(app).get("/api/health");
    const without = await request(app).get("/health");

    expect(withPrefix.status).toBe(200);
    expect(without.status).toBe(200);
  });

  it("keeps auth on prefixed routes", async () => {
    const res = await request(app).get("/api/perfis");

    expect(res.status).toBe(401);
  });

  it("keeps the query string", async () => {
    const res = await request(app).get("/api/relatorios/sinais?formato=csv");

    expect(res.status).toBe(401);
  });
});

describe("web build", () => {
  it("serves the static files", async () => {
    const res = await request(app).get("/_expo/entry.js");

    expect(res.status).toBe(200);
    expect(res.text).toBe("console.log(1)");
  });

  it("answers browser navigation with index.html", async () => {
    const res = await request(app).get("/").set("Accept", "text/html");

    expect(res.status).toBe(200);
    expect(res.text).toContain("GeronTON");
  });

  it("answers HEAD on the app's pages", async () => {
    const res = await request(app).head("/").set("Accept", "text/html");

    expect(res.status).toBe(200);
  });

  it("leaves 404s alone for clients that accept anything", async () => {
    const res = await request(app).get("/api/nao-existe").set("Accept", "*/*");

    expect(res.status).toBe(404);
    expect(res.text).not.toContain("GeronTON");
  });

  it("leaves API 404s alone", async () => {
    const res = await request(app)
      .get("/api/nao-existe")
      .set("Accept", "application/json");

    expect(res.status).toBe(404);
    expect(res.text).not.toContain("GeronTON");
  });
});
