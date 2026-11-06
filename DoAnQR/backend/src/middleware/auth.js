const AppError = require("../utils/AppError");
const { verifyAccess } = require("../utils/tokens");
const User = require("../models/User");

// Bắt buộc đăng nhập. Luôn kiểm tra lại DB để tài khoản bị khóa mất hiệu lực ngay.
async function authenticate(req, _res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new AppError(401, "Chưa đăng nhập");

    let payload;
    try { payload = verifyAccess(token); }
    catch { throw new AppError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"); }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new AppError(401, "Tài khoản không tồn tại hoặc đã bị khóa");

    req.user = user;
    next();
}

// RBAC: chỉ cho phép các vai trò nêu tên. Dùng sau authenticate.
const authorize = (...roles) => (req, _res, next) => {
    if (!roles.includes(req.user.role)) throw new AppError(403, "Bạn không có quyền thực hiện thao tác này");
    next();
};

module.exports = { authenticate, authorize };
