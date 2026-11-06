const router = require("express").Router();
const { z } = require("zod");
const Category = require("../models/Category");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");

const schema = z.object({
    name: z.string().trim().min(1).max(80),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
});
const patch = schema.partial().refine((d) => Object.keys(d).length > 0, "Không có dữ liệu để cập nhật");

router.use(authenticate);

router.get("/", async (_req, res) => {
    res.json({ success: true, data: await Category.find().sort({ sortOrder: 1, name: 1 }) });
});

router.post("/", authorize("owner"), validate(schema), async (req, res) => {
    res.status(201).json({ success: true, data: await Category.create(req.valid.body) });
});

router.put("/:id", authorize("owner"), validate(patch), async (req, res) => {
    const c = await Category.findByIdAndUpdate(req.params.id, req.valid.body, { new: true, runValidators: true });
    if (!c) throw new AppError(404, "Không tìm thấy danh mục");
    res.json({ success: true, data: c });
});

// Xóa danh mục đang có món => chặn và cảnh báo (FR-23).
router.delete("/:id", authorize("owner"), async (req, res) => {
    const n = await Product.countDocuments({ category: req.params.id });
    if (n > 0) throw new AppError(409, `Danh mục đang có ${n} món. Hãy chuyển hoặc xóa các món trước.`);
    const c = await Category.findByIdAndDelete(req.params.id);
    if (!c) throw new AppError(404, "Không tìm thấy danh mục");
    res.json({ success: true, message: "Đã xóa danh mục" });
});

module.exports = router;
