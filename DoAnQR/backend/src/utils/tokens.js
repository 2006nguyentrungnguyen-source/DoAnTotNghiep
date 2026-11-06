const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const signAccess = (user) =>
    jwt.sign({ sub: String(user._id), role: user.role }, env.jwtAccessSecret, { expiresIn: env.accessExpires });

const signRefresh = (user) =>
    jwt.sign({ sub: String(user._id), typ: "refresh" }, env.jwtRefreshSecret, { expiresIn: env.refreshExpires });

const verifyAccess = (t) => jwt.verify(t, env.jwtAccessSecret);
const verifyRefresh = (t) => {
    const p = jwt.verify(t, env.jwtRefreshSecret);
    if (p.typ !== "refresh") throw new Error("not a refresh token");
    return p;
};

// Token bàn: 24 byte ngẫu nhiên mật mã học => 48 ký tự hex (yêu cầu NFR-04: >= 16 ký tự).
const newTableToken = () => crypto.randomBytes(24).toString("hex");

// Mã đơn hiển thị, ví dụ DH-K3F9A2-7QX
const newOrderCode = () =>
    "DH-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" +
    crypto.randomBytes(2).toString("hex").toUpperCase();

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, newTableToken, newOrderCode };
