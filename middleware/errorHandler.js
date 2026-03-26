function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }

  return res.status(err.status || 500).render("error", {
    title: "Error",
    message: err.message || "Something went wrong",
  });
}

module.exports = errorHandler;