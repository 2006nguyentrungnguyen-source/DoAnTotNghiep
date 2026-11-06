// Đọc & kiểm tra biến môi trường một chỗ duy nhất.
const required = ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 5000,
    mongoUri: process.env.MONGODB_URI,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
    // URL frontend: QR của bàn sẽ trỏ tới `${clientUrl}/order?token=...`
    clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, ""),
    corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173")
        .split(",").map((s) => s.trim()).filter(Boolean),
};

function assertEnv() {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(`Thiếu biến môi trường: ${missing.join(", ")} (xem .env.example)`);
    }
    if (env.nodeEnv === "production" &&
        (env.jwtAccessSecret.length < 32 || env.jwtRefreshSecret.length < 32)) {
        throw new Error("JWT secret phải dài >= 32 ký tự khi chạy production");
    }
}

module.exports = { env, assertEnv };
