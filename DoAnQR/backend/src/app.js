const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

const { env } = require("./config/env");
const { apiLimiter } = require("./middleware/rateLimit");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1); // chạy sau reverse proxy (Render/Nginx) để rate limit lấy đúng IP
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // cho phép frontend khác origin tải ảnh
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: "100kb" }));
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.get("/", (_req, res) => res.json({ success: true, message: "QR Cafe Backend" }));

app.get("/api/health", (_req, res) => {
    const databaseStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.status(databaseStatus === "connected" ? 200 : 503).json({
        success: true, message: "QR Cafe Backend is running", database: databaseStatus,
    });
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), { maxAge: "7d" }));

app.use("/api", apiLimiter);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/products", require("./routes/products"));
app.use("/api/tables", require("./routes/tables"));
app.use("/api/public", require("./routes/public"));
app.use("/api/orders", require("./routes/orders"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
