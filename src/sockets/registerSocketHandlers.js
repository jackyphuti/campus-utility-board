const {
  getAllUtilities,
  allowedStatuses,
  updateUtility
} = require("../services/utilityBoardStore");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.emit("utility:bootstrap", getAllUtilities());

    socket.on("utility:subscribe", (utilityType) => {
      const room = String(utilityType || "").trim().toLowerCase();

      if (!room) {
        return;
      }

      socket.join(`utility:${room}`);
    });

    socket.on("utility:update", (payload = {}) => {
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
        const updated = updateUtility(utilityType, { status, message });

        io.emit("utility:updated", updated);
        io.to(`utility:${utilityType}`).emit("utility:room-updated", updated);
      } catch (error) {
        socket.emit("utility:error", { message: error.message });
      }
    });
  });
}

module.exports = registerSocketHandlers;
