const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimit");
const { signAccess, signRefresh, verifyRefresh } = require("../utils/tokens");

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
// Hash giả để thời gian phản hồi gần như nhau khi user không tồn tại (chống dò username).
const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });

const session = (user) => ({
    accessToken: signAccess(user),
    refreshToken: signRefresh(user),
    user: user.toJSON(),
});

// POST /api/auth/login
router.post("/login", loginLimiter, validate(loginSchema), async (req, res) => {
    const { username, password } = req.valid.body;
    const user = await User.findOne({ username: username.toLowerCase() }).select("+passwordHash");

    if (user && user.lockUntil && user.lockUntil > new Date()) {
        throw new AppError(423, "Tài khoản tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau");
    }

    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok || !user.isActive) {
        if (user && user.isActive) {
            user.failedLogins += 1;
            if (user.failedLogins >= MAX_FAILS) { user.lockUntil = new Date(Date.now() + LOCK_MS); user.failedLogins = 0; }
            await user.save();
        }
        throw new AppError(401, "Sai tên đăng nhập hoặc mật khẩu");
    }

    if (user.failedLogins || user.lockUntil) { user.failedLogins = 0; user.lockUntil = null; await user.save(); }
    res.json({ success: true, data: session(user) });
});

// POST /api/auth/refresh
router.post("/refresh", validate(refreshSchema), async (req, res) => {
    let payload;
    try { payload = verifyRefresh(req.valid.body.refreshToken); }
    catch { throw new AppError(401, "Refresh token không hợp lệ hoặc đã hết hạn"); }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
    res.json({ success: true, data: { accessToken: signAccess(user) } });
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => res.json({ success: true, data: req.user.toJSON() }));

module.exports = router;
