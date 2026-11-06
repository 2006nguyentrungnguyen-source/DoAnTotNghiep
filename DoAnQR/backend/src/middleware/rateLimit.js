const rateLimit = require("express-rate-limit");

const handler = (message) => (_req, res) => res.status(429).json({ success: false, message });

// Giới hạn chung theo IP cho toàn bộ API.
const apiLimiter = rateLimit({
    windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false,
    handler: handler("Quá nhiều yêu cầu, vui lòng thử lại sau"),
});

// Chống brute-force đăng nhập theo IP.
const loginLimiter = rateLimit({
    windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
    handler: handler("Đăng nhập sai quá nhiều lần, thử lại sau 15 phút"),
});

// Chống spam đơn giả (FR-34): tối đa 8 lần đặt / phút cho MỖI TOKEN BÀN.
// Khóa theo token (không theo IP) vì nhiều khách có thể dùng chung wifi quán.
const orderLimiter = rateLimit({
    windowMs: 60_000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false,
    keyGenerator: (req) => `tbl:${String((req.body && req.body.token) || req.query.token || "none")}`,
    validate: { keyGeneratorIpFallback: false },
    handler: handler("Bạn gửi đơn quá nhanh, vui lòng thử lại sau ít phút"),
});

module.exports = { apiLimiter, loginLimiter, orderLimiter };
