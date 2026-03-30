function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error("Unhandled server error:", err);
  }

  res.status(statusCode).json({ message });
}

module.exports = errorHandler;
