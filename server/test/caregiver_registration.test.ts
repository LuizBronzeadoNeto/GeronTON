import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db.js";
import { PoolClient } from "pg";
import { afterEach, before, beforeEach } from "node:test";

let caregiverToken: string;
let professionalToken: string;
let client: PoolClient;


beforeAll(async() => {
    const caregiverRes = await request(app)
    .post("/login").send({email: "cuidador@demo.com", password: "senha123"});
    caregiverToken = caregiverRes.body.token;

    const professionalRes = await request(app)
    .post("/login").send({email: "profissional@demo.com", password: "senha123"});
    professionalToken = professionalRes.body.token;

});

afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = $1", ["newcaregiver@demo.com"]);
    await pool.end();
});


/**
 * Integration tests for POST /cuidadores. These hit the real database to retrieve the tokens, so Postgres
 * must be running and seeded (see docker-compose.yml + db/seed.sql).
 */
describe("POST /cuidadores", () =>{
    it("Authorized creation. Returns id, email and role of the new caregiver", async () => {
        //await pool.query("DELETE FROM users WHERE email = $1", ["newcaregiver@demo.com"]);
        const res = await request(app).post("/cuidadores").set("Authorization", `Bearer ${professionalToken}`)
        .send({email: "newcaregiver@demo.com", password: "pass123"});

        expect(res.status).toBe(201);
        expect(res.body.id).toEqual(expect.any(Number));
        expect(res.body).toMatchObject({email: "newcaregiver@demo.com", role: "cuidador"});
        expect(res.body.password).toBeUndefined();
    });
    it("Denies the creation of a duplicate caregiver, returns 409", async () => {
        const res = await request(app).post("/cuidadores").set("Authorization", `Bearer ${professionalToken}`)
        .send({email: "newcaregiver@demo.com", password: "pass123"});

        expect(res.status).toBe(409);
    });
    it("Denies the creation of a caregiver by another caregiver eturns 403 forbidden", async () => {
        const res = await request(app).post("/cuidadores").set("Authorization", `Bearer ${caregiverToken}`)
        .send({email: "anothercaregiver@demo.com", password: "pass123"});

        expect(res.status).toBe(403);
    });
    it("Denies the creation of a caregiver without providing an email, returns 400", async () => {
        const res = await request(app).post("/cuidadores").set("Authorization", `Bearer ${professionalToken}`)
        .send({password: "pass123"});

        expect(res.status).toBe(400);
    });
    it("Denies the creation of a caregiver without providing an email, returns 400", async () => {
        const res = await request(app).post("/cuidadores").set("Authorization", `Bearer ${professionalToken}`)
        .send({email: "anothercaregiver@demo.com"});

        expect(res.status).toBe(400);
    });
    it("Allows a newly created caregiver to log in", async () =>{
    const res = await request(app).post("/login")
    .send({email: "newcaregiver@demo.com", password: "pass123"})

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ role: "cuidador" });
        expect(res.body.token).toBeDefined();
        expect(res.body.id).toEqual(expect.any(Number));
        expect(res.body.password).toBeUndefined();
    });

});