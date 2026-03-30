const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const createApp = require("../src/app");

const app = createApp();

test("GET /api/v1/health returns service health", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.body.timestamp);
});

test("auth flow register -> login -> me works", async () => {
  const email = `tester-${Date.now()}@campus.local`;
  const password = "StrongPass!123";

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Campus Tester",
    email,
    password
  });

  assert.equal(register.status, 201);
  assert.ok(register.body.token);

  const login = await request(app).post("/api/v1/auth/login").send({
    email,
    password
  });

  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const me = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`);

  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
});

test("PATCH /api/v1/utilities/:utilityType requires auth and updates status", async () => {
  const email = `ops-${Date.now()}@campus.local`;
  const password = "StrongPass!456";

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Ops User",
    email,
    password
  });

  const unauthorized = await request(app)
    .patch("/api/v1/utilities/electricity")
    .send({ status: "outage", message: "Generator maintenance" });

  assert.equal(unauthorized.status, 401);

  const authorized = await request(app)
    .patch("/api/v1/utilities/electricity")
    .set("Authorization", `Bearer ${register.body.token}`)
    .send({ status: "outage", message: "Generator maintenance" });

  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.utility.status, "outage");
});
