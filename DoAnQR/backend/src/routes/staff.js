const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate, authorize("owner"));

const createSchema = z.object({
    username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Chỉ gồm chữ, số, . _ -"),
    password: z.string().min(6).max(100),
    fullName: z.string().trim().max(100).optional(),
    role: z.enum(["owner", "staff"]).default("staff"),
});
const updateSchema = z.object({
    fullName: z.string().trim().max(100).optional(),
    password: z.string().min(6).max(100).optional(),
    role: z.enum(["owner", "staff"]).optional(),
    isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, "Không có dữ liệu để cập nhật");

router.get("/", async (_req, res) => {
    const users = await User.find().sort({ createdAt: 1 });
    res.json({ success: true, data: users });
});

router.post("/", validate(createSchema), async (req, res) => {
    const { password, ...rest } = req.valid.body;
    const user = await User.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ success: true, data: user.toJSON() });
});

router.put("/:id", validate(updateSchema), async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, "Không tìm thấy nhân viên");
    const { password, ...rest } = req.valid.body;

    // Chủ quán không được tự khóa / tự hạ quyền chính mình (tránh mất quyền quản trị).
    if (String(user._id) === String(req.user._id) && (rest.isActive === false || (rest.role && rest.role !== "owner"))) {
        throw new AppError(400, "Không thể khóa hoặc hạ quyền chính tài khoản đang đăng nhập");
    }
    Object.assign(user, rest);
    if (password) user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true, data: user.toJSON() });
});

// DELETE = khóa tài khoản (không xóa hẳn để giữ lịch sử thao tác).
router.delete("/:id", async (req, res) => {
    if (req.params.id === String(req.user._id)) throw new AppError(400, "Không thể khóa chính tài khoản đang đăng nhập");
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) throw new AppError(404, "Không tìm thấy nhân viên");
    res.json({ success: true, data: user.toJSON() });
});

module.exports = router;
