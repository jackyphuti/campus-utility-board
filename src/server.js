const http = require("http");
const { Server } = require("socket.io");

const env = require("./config/env");
const createApp = require("./app");
const registerSocketHandlers = require("./sockets/registerSocketHandlers");

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.socketCorsOrigin === "*" ? true : env.socketCorsOrigin.split(",").map((value) => value.trim()),
    credentials: true
  }
});

app.set("io", io);
registerSocketHandlers(io);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Campus backend running on port ${env.port}`);
});
