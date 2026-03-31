const {
  getAllUtilities,
  allowedStatuses,
  updateUtility
} = require("../services/utilityBoardStore");
const { listPosts, createPost } = require("../services/postStore");
const { getAllStudyGroups } = require("../services/studyGroupStore");
const { getAllLabs, ensureDefaultLabsInDb } = require("../services/labStore");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    getAllUtilities()
      .then((utilities) => {
        socket.emit("utility:bootstrap", utilities);
      })
      .catch((error) => {
        socket.emit("utility:error", { message: error.message });
      });

    listPosts()
      .then((posts) => {
        socket.emit("post:bootstrap", posts);
      })
      .catch((error) => {
        socket.emit("post:error", { message: error.message });
      });

    // Bootstrap study groups
    getAllStudyGroups()
      .then((groups) => {
        socket.emit("study:bootstrap", groups);
      })
      .catch((error) => {
        socket.emit("study:error", { message: error.message });
      });

    // Bootstrap labs with defaults
    ensureDefaultLabsInDb()
      .then(() => getAllLabs())
      .then((labs) => {
        socket.emit("lab:bootstrap", labs);
      })
      .catch((error) => {
        socket.emit("lab:error", { message: error.message });
      });

    socket.on("utility:subscribe", (utilityType) => {
      const room = String(utilityType || "").trim().toLowerCase();

      if (!room) {
        return;
      }

      socket.join(`utility:${room}`);
    });

    socket.on("utility:update", async (payload = {}) => {
      const utilityType = String(payload.utilityType || "").trim().toLowerCase();
      const status = String(payload.status || "").trim().toLowerCase();
      const message = String(payload.message || "").trim();

      if (!allowedStatuses.has(status)) {
        socket.emit("utility:error", {
          message: "Invalid status for utility:update event."
        });
        return;
      }

      try {
        const updated = await updateUtility(utilityType, { status, message });

        io.emit("utility:updated", updated);
        io.to(`utility:${utilityType}`).emit("utility:room-updated", updated);
      } catch (error) {
        socket.emit("utility:error", { message: error.message });
      }
    });

    socket.on("post:create", async (payload = {}) => {
      const text = payload.text;
      const location = payload.location;
      const author = payload.author;

      if (!author || !author.id || !author.email) {
        socket.emit("post:error", { message: "author is required for post:create." });
        return;
      }

      try {
        const createdPost = await createPost({
          text,
          location,
          author
        });

        io.emit("post:created", createdPost);
        io.emit("receive_new_post", createdPost);
      } catch (error) {
        socket.emit("post:error", { message: error.message });
      }
    });
  });
}

module.exports = registerSocketHandlers;
