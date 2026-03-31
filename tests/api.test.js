const test = require("node:test");
const { before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const { Server } = require("socket.io");
const { io: createSocketClient } = require("socket.io-client");

const createApp = require("../src/app");
const registerSocketHandlers = require("../src/sockets/registerSocketHandlers");

const app = createApp();

let mongoServer;

function onceSocketEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for socket event: ${eventName}`));
    }, timeoutMs);

    function handleEvent(data) {
      cleanup();
      resolve(data);
    }

    function handleConnectError(error) {
      cleanup();
      reject(error);
    }

    function cleanup() {
      clearTimeout(timer);
      socket.off(eventName, handleEvent);
      socket.off("connect_error", handleConnectError);
    }

    socket.once(eventName, handleEvent);
    socket.once("connect_error", handleConnectError);
  });
}

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri("campus_backend_test");
  await mongoose.connect(process.env.MONGO_URI);
});

beforeEach(async () => {
  const collectionNames = Object.keys(mongoose.connection.collections);
  await Promise.all(collectionNames.map((name) => mongoose.connection.collections[name].deleteMany({})));
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("GET /api/v1/health returns service health", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.database, "connected");
  assert.ok(response.body.timestamp);
});

test("auth flow register -> login -> me works", async () => {
  const email = `tester-${Date.now()}@campus.local`;
  const password = "StrongPass!123";

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Campus Tester",
    email,
    password,
    university: "UP",
    degree: "Computer Science",
    yearOfStudy: "2nd"
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
    password,
    university: "UP",
    degree: "Electrical Engineering",
    yearOfStudy: "3rd"
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

test("auth validation rejects invalid register email", async () => {
  const response = await request(app).post("/api/v1/auth/register").send({
    name: "Campus Tester",
    email: "not-an-email",
    password: "StrongPass!123",
    university: "UP",
    degree: "Computer Science",
    yearOfStudy: "2nd"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "A valid email address is required.");
});

test("GET /api/v1/auth/me rejects malformed bearer token", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", "Bearer not.a.valid.token");

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid or expired token.");
});

test("GET /api/v1/auth/providers reports configured SSO providers", async () => {
  const response = await request(app).get("/api/v1/auth/providers");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.providers, {
    google: false,
    microsoft: false
  });
});

test("SSO routes return 501 when provider is not configured", async () => {
  const google = await request(app).get("/api/v1/auth/google");
  const microsoft = await request(app).get("/api/v1/auth/microsoft");

  assert.equal(google.status, 501);
  assert.equal(google.body.message, "Google SSO is not configured on this server.");
  assert.equal(microsoft.status, 501);
  assert.equal(microsoft.body.message, "Microsoft SSO is not configured on this server.");
});

test("POST /api/v1/posts requires auth", async () => {
  const response = await request(app)
    .post("/api/v1/posts")
    .send({ text: "Power outage near library", location: "Library" });

  assert.equal(response.status, 401);
});

test("login returns explicit 404 when user does not exist", async () => {
  const response = await request(app).post("/api/v1/auth/login").send({
    email: `missing-${Date.now()}@campus.local`,
    password: "StrongPass!123"
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "User does not exist. Please create a new account.");
});

test("POST /api/v1/posts validates non-empty text", async () => {
  const email = `posts-${Date.now()}@campus.local`;
  const password = "StrongPass!999";

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Posts User",
    email,
    password,
    university: "UP",
    degree: "Information Systems",
    yearOfStudy: "1st"
  });

  const response = await request(app)
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${register.body.token}`)
    .send({ text: "   ", location: "Library" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "text is required.");
});

test("posts flow create -> list returns newest post", async () => {
  const email = `feed-${Date.now()}@campus.local`;
  const password = "StrongPass!321";

  const register = await request(app).post("/api/v1/auth/register").send({
    name: "Feed User",
    email,
    password,
    university: "UP",
    degree: "Data Science",
    yearOfStudy: "4th"
  });

  const create = await request(app)
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${register.body.token}`)
    .send({ text: "Internet down in Lab 2", location: "Lab 2" });

  assert.equal(create.status, 201);
  assert.equal(create.body.post.text, "Internet down in Lab 2");
  assert.equal(create.body.post.author.email, email);

  const list = await request(app).get("/api/v1/posts");

  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.posts));
  assert.equal(list.body.posts[0].id, create.body.post.id);
});

test("socket bootstraps data and broadcasts updates", async (t) => {
  const socketApp = createApp();
  const server = http.createServer(socketApp);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  socketApp.set("io", io);
  registerSocketHandlers(io);

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  t.after(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  });

  const { port } = server.address();

  const client = createSocketClient(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
    autoConnect: false,
    forceNew: true,
    reconnection: false
  });

  t.after(() => {
    client.close();
  });

  const utilityBootstrapPromise = onceSocketEvent(client, "utility:bootstrap");
  const postBootstrapPromise = onceSocketEvent(client, "post:bootstrap");

  client.connect();

  const utilities = await utilityBootstrapPromise;
  const posts = await postBootstrapPromise;

  assert.ok(Array.isArray(utilities));
  assert.ok(Array.isArray(posts));

  const createdPostPromise = onceSocketEvent(client, "post:created");

  client.emit("post:create", {
    text: "Socket hello from integration test",
    location: "Lab 7",
    author: {
      id: "socket-user-1",
      name: "Socket Tester",
      email: "socket-tester@campus.local"
    }
  });

  const createdPost = await createdPostPromise;
  assert.equal(createdPost.text, "Socket hello from integration test");
  assert.equal(createdPost.author.email, "socket-tester@campus.local");

  client.emit("utility:subscribe", "internet");
  await new Promise((resolve) => setTimeout(resolve, 25));

  const roomUpdatedPromise = onceSocketEvent(client, "utility:room-updated");

  client.emit("utility:update", {
    utilityType: "internet",
    status: "degraded",
    message: "Socket test update"
  });

  const roomUpdated = await roomUpdatedPromise;
  assert.equal(roomUpdated.utilityType, "internet");
  assert.equal(roomUpdated.status, "degraded");
});
